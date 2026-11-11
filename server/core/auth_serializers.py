from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from .models import User, UserProfile, Device, UserSession

class UserSummarySerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.CharField(source='profile.bio', read_only=True)
    status_message = serializers.CharField(source='profile.status_message', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'first_name',
            'last_name', 'avatar_url', 'bio', 'status_message',
            'is_verified', 'is_2fa_enabled', 'is_online', 'last_seen', 'created_at'
        ]

    def get_avatar_url(self, obj):
        try:
            if obj.profile.avatar:
                return obj.profile.avatar.url
        except Exception:
            pass
        return None


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'phone_number', 'password', 'password_confirm', 'first_name', 'last_name', 'full_name']

    def validate(self, attrs):
        password = attrs.get('password')
        confirm = attrs.get('password_confirm')
        if confirm and password != confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        email = attrs.get('email', '').strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        phone = attrs.get('phone_number', '').strip()
        if phone and User.objects.filter(phone_number=phone).exists():
            raise serializers.ValidationError({"phone_number": "A user with this phone number already exists."})
            
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        full_name = validated_data.pop('full_name', '').strip()
        if full_name and not validated_data.get('first_name'):
            parts = full_name.split(' ', 1)
            validated_data['first_name'] = parts[0]
            if len(parts) > 1:
                validated_data['last_name'] = parts[1]

        password = validated_data.pop('password')
        email = validated_data.get('email', '').lower().strip()
        validated_data['email'] = email
        
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.get_or_create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Phone Number or Username")
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_name = serializers.CharField(required=False, allow_blank=True)
    device_type = serializers.CharField(required=False, default='desktop')

    def validate(self, attrs):
        identifier = attrs.get('identifier', '').strip()
        password = attrs.get('password')

        # Look up user by email, username, or phone
        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier) | Q(phone_number=identifier)
        ).first()

        if not user or not user.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid credentials provided."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive or suspended."})

        attrs['user'] = user
        return attrs


class SendOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email or Phone Number")
    purpose = serializers.ChoiceField(choices=['verification', 'login', 'reset_password', '2fa'], default='verification')


class VerifyOTPSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)
    code = serializers.CharField(required=True, max_length=10)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, max_length=10)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])


class TwoFactorVerifySerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)
    code = serializers.CharField(required=True, max_length=10)
    device_id = serializers.CharField(required=False, allow_blank=True)
    device_name = serializers.CharField(required=False, allow_blank=True)
    device_type = serializers.CharField(required=False, default='desktop')


class DeviceSessionSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_type = serializers.CharField(source='device.device_type', read_only=True)
    browser = serializers.CharField(source='device.browser', read_only=True)
    os = serializers.CharField(source='device.os', read_only=True)
    last_active = serializers.DateTimeField(source='device.last_active', read_only=True)

    class Meta:
        model = UserSession
        fields = [
            'id', 'session_token', 'ip_address', 'user_agent',
            'expires_at', 'is_revoked', 'created_at',
            'device_name', 'device_type', 'browser', 'os', 'last_active'
        ]


class AccountRecoverySerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    recovery_code = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
