import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q
from django.utils import timezone
from .models import User, UserProfile, Device, UserSession
from .auth_serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSummarySerializer,
    SendOTPSerializer, VerifyOTPSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, TwoFactorVerifySerializer, DeviceSessionSerializer,
    AccountRecoverySerializer
)
from .auth_services import (
    set_user_otp, verify_user_otp, register_user_session
)

class RegisterAPIView(APIView):
    """Register a new user account and dispatch verification OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            otp = set_user_otp(user)
            tokens = register_user_session(user, request)
            return Response({
                'message': 'Account created successfully. A verification code has been generated.',
                'user': UserSummarySerializer(user).data,
                'tokens': tokens,
                'otp_debug': otp, # included for frictionless local testing
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginAPIView(APIView):
    """Authenticate via email, phone, or username. Supports 2FA challenge."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Check if Two-Factor Authentication is enabled
            if user.is_2fa_enabled:
                otp = set_user_otp(user)
                return Response({
                    'requires_2fa': True,
                    'identifier': user.email,
                    'message': 'Two-Factor Authentication is required. Enter the verification code sent to your account.',
                    'otp_debug': otp,
                }, status=status.HTTP_200_OK)
            
            # Direct Login
            device_id = request.data.get('device_id')
            device_name = request.data.get('device_name')
            device_type = request.data.get('device_type', 'desktop')
            
            tokens = register_user_session(user, request, device_id, device_name, device_type)
            user.is_online = True
            user.last_seen = timezone.now()
            user.save(update_fields=['is_online', 'last_seen'])

            return Response({
                'message': 'Login successful.',
                'user': UserSummarySerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Verify2FAAPIView(APIView):
    """Complete 2FA challenge with code to obtain JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier']
            code = serializer.validated_data['code']
            
            user = User.objects.filter(
                Q(email__iexact=identifier) | Q(phone_number=identifier) | Q(username__iexact=identifier)
            ).first()
            
            if not user or not verify_user_otp(user, code):
                return Response({'detail': 'Invalid or expired 2FA verification code.'}, status=status.HTTP_400_BAD_REQUEST)
            
            device_id = serializer.validated_data.get('device_id')
            device_name = serializer.validated_data.get('device_name')
            device_type = serializer.validated_data.get('device_type', 'desktop')
            
            tokens = register_user_session(user, request, device_id, device_name, device_type)
            user.is_online = True
            user.last_seen = timezone.now()
            user.save(update_fields=['is_online', 'last_seen'])
            
            return Response({
                'message': '2FA verification successful.',
                'user': UserSummarySerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SendOTPAPIView(APIView):
    """Dispatch OTP for verification or login."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier'].strip()
            user = User.objects.filter(
                Q(email__iexact=identifier) | Q(phone_number=identifier) | Q(username__iexact=identifier)
            ).first()
            if not user:
                return Response({'detail': 'No account found with this identifier.'}, status=status.HTTP_404_NOT_FOUND)
            
            otp = set_user_otp(user)
            return Response({
                'message': f'OTP code sent successfully to {user.email}.',
                'otp_debug': otp,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPAPIView(APIView):
    """Verify given OTP code for user account."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier'].strip()
            code = serializer.validated_data['code'].strip()
            
            user = User.objects.filter(
                Q(email__iexact=identifier) | Q(phone_number=identifier) | Q(username__iexact=identifier)
            ).first()
            if not user:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            if verify_user_otp(user, code):
                return Response({'message': 'OTP verified successfully.', 'is_verified': True}, status=status.HTTP_200_OK)
            return Response({'detail': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordAPIView(APIView):
    """Request password reset OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower().strip()
            user = User.objects.filter(email=email).first()
            if user:
                otp = set_user_otp(user, expiration_minutes=15)
                return Response({
                    'message': 'If an account matches this email, a reset code has been sent.',
                    'otp_debug': otp,
                }, status=status.HTTP_200_OK)
            return Response({
                'message': 'If an account matches this email, a reset code has been sent.'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordAPIView(APIView):
    """Verify OTP and update user password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower().strip()
            code = serializer.validated_data['code'].strip()
            new_password = serializer.validated_data['new_password']
            
            user = User.objects.filter(email=email).first()
            if not user or not verify_user_otp(user, code):
                return Response({'detail': 'Invalid or expired reset code.'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(new_password)
            user.save(update_fields=['password'])
            
            # Invalidate previous sessions
            UserSession.objects.filter(user=user).update(is_revoked=True)
            
            return Response({'message': 'Password has been reset successfully. Please log in with your new password.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutAPIView(APIView):
    """Revoke session and sign out user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        token = request.data.get('refresh_token')
        
        if token:
            UserSession.objects.filter(user=user, session_token=token[:255]).update(is_revoked=True)
        else:
            UserSession.objects.filter(user=user).update(is_revoked=True)
            
        user.is_online = False
        user.last_seen = timezone.now()
        user.save(update_fields=['is_online', 'last_seen'])
        
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class TwoFactorToggleAPIView(APIView):
    """Enable or disable two-factor authentication."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        action = request.data.get('action') # 'enable' or 'disable'
        
        if action == 'enable':
            user.is_2fa_enabled = True
            user.two_factor_secret = secrets.token_hex(16)
            user.save(update_fields=['is_2fa_enabled', 'two_factor_secret'])
            return Response({
                'message': 'Two-Factor Authentication enabled.',
                'is_2fa_enabled': True,
                'two_factor_secret': user.two_factor_secret,
            }, status=status.HTTP_200_OK)
        elif action == 'disable':
            code = request.data.get('code')
            if not code or not verify_user_otp(user, code):
                # Allow password confirmation as fallback
                password = request.data.get('password')
                if not password or not user.check_password(password):
                    return Response({'detail': 'Confirmation password or valid code required to disable 2FA.'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.is_2fa_enabled = False
            user.two_factor_secret = None
            user.save(update_fields=['is_2fa_enabled', 'two_factor_secret'])
            return Response({'message': 'Two-Factor Authentication disabled.', 'is_2fa_enabled': False}, status=status.HTTP_200_OK)
            
        return Response({'detail': "Invalid action. Use 'enable' or 'disable'."}, status=status.HTTP_400_BAD_REQUEST)


class ActiveSessionsAPIView(APIView):
    """List all registered devices and sessions for user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_revoked=False)
        return Response(DeviceSessionSerializer(sessions, many=True).data)


class ChangePasswordAPIView(APIView):
    """Change user password while authenticated."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password or len(new_password) < 8:
            return Response({'detail': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})


class RevokeSessionAPIView(APIView):
    """Revoke a specific session or all other sessions."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id=None):
        sid = session_id or request.data.get('session_id')
        revoke_all_others = request.data.get('revoke_all_others', False)
        
        if revoke_all_others:
            current_token = request.data.get('current_token', '')[:255]
            UserSession.objects.filter(user=request.user).exclude(session_token=current_token).update(is_revoked=True)
            return Response({'message': 'All other sessions have been terminated.'})
            
        if sid:
            UserSession.objects.filter(user=request.user, id=sid).update(is_revoked=True)
            return Response({'message': 'Session revoked successfully.'})
            
        return Response({'detail': 'session_id or revoke_all_others required.'}, status=status.HTTP_400_BAD_REQUEST)


class DeleteAccountAPIView(APIView):
    """Soft delete or permanently remove user account."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response({'detail': 'Invalid password confirmation.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        user.is_active = False
        user.save(update_fields=['is_active'])
        UserSession.objects.filter(user=user).update(is_revoked=True)
        return Response({'message': 'Account deactivated successfully.'}, status=status.HTTP_200_OK)


class AccountRecoveryAPIView(APIView):
    """Recover an inactive or forgotten account."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AccountRecoverySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower().strip()
            user = User.objects.filter(email=email).first()
            if not user:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
            code = serializer.validated_data['recovery_code'].strip()
            if not verify_user_otp(user, code):
                return Response({'detail': 'Invalid recovery code.'}, status=status.HTTP_400_BAD_REQUEST)
                
            user.is_active = True
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['is_active', 'password'])
            return Response({'message': 'Account recovered successfully. Please log in.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeAPIView(APIView):
    """Retrieve and update authenticated user details."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSummarySerializer(request.user).data)

    def patch(self, request):
        user = request.user
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'username' in request.data:
            new_username = request.data['username'].strip()
            if User.objects.filter(username__iexact=new_username).exclude(id=user.id).exists():
                return Response({'username': 'This username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
            user.username = new_username
        if 'phone_number' in request.data:
            user.phone_number = request.data['phone_number']
        user.save()
        return Response(UserSummarySerializer(user).data)
