import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Device, UserSession

def generate_otp(length=6) -> str:
    """Generate a cryptographically secure random numeric OTP."""
    return ''.join(secrets.choice('0123456789') for _ in range(length))

def set_user_otp(user: User, expiration_minutes=10) -> str:
    """Generate, set, and save OTP on user model with expiration timestamp."""
    code = generate_otp(6)
    user.otp_code = code
    user.otp_expires_at = timezone.now() + timedelta(minutes=expiration_minutes)
    user.save(update_fields=['otp_code', 'otp_expires_at'])
    
    # In development/production, log or dispatch email/SMS
    print(f"[ChatNova Security] OTP for {user.email}: {code} (expires in {expiration_minutes}m)")
    return code

def verify_user_otp(user: User, code: str) -> bool:
    """Verify given OTP code against user's stored code and expiration."""
    if not user.otp_code or not user.otp_expires_at:
        return False
    if timezone.now() > user.otp_expires_at:
        return False
    if user.otp_code.strip() != code.strip():
        return False
    
    # Clear OTP upon successful verification
    user.otp_code = None
    user.otp_expires_at = None
    user.is_verified = True
    user.save(update_fields=['otp_code', 'otp_expires_at', 'is_verified'])
    return True

def get_client_ip(request) -> str:
    """Extract client IP address from HTTP request headers."""
    if not request:
        return '127.0.0.1'
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')

def register_user_session(user: User, request=None, device_id=None, device_name=None, device_type='desktop') -> tuple:
    """
    Generate JWT tokens, register device, and record user session.
    """
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown') if request else 'Unknown'
    
    if not device_id:
        device_id = hashlib.sha256(f"{user.id}-{user_agent}-{ip_address}".encode()).hexdigest()[:32]
        
    device, _ = Device.objects.update_or_create(
        user=user,
        device_id=device_id,
        defaults={
            'device_name': device_name or ('Browser on ' + user_agent[:30]),
            'device_type': device_type,
            'browser': user_agent[:60],
            'ip_address': ip_address,
            'last_active': timezone.now(),
            'is_active': True,
        }
    )
    
    session = UserSession.objects.create(
        user=user,
        device=device,
        session_token=refresh_token[:255],
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=timezone.now() + timedelta(days=7),
        is_revoked=False
    )
    
    return {
        'access': access_token,
        'refresh': refresh_token,
        'device_id': device_id,
        'session_id': str(session.id),
    }
