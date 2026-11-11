import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    """
    Custom User model supporting email and phone authentication,
    multi-device sessions, 2FA, OTP verification, and presence tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    
    is_verified = models.BooleanField(default=False)
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=64, blank=True, null=True)
    
    otp_code = models.CharField(max_length=10, blank=True, null=True)
    otp_expires_at = models.DateTimeField(blank=True, null=True)
    
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(default=timezone.now)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['is_online']),
        ]

    def __str__(self):
        return self.username or self.email


class UserProfile(models.Model):
    """
    Extended user profile storing social details and privacy preferences.
    """
    PRIVACY_CHOICES = [
        ('everyone', 'Everyone'),
        ('contacts', 'My Contacts'),
        ('nobody', 'Nobody'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True, default="Hey there! I am using ChatNova.")
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    status_message = models.CharField(max_length=120, blank=True, default="Available")
    
    # Privacy Controls
    hide_last_seen = models.BooleanField(default=False)
    hide_online_status = models.BooleanField(default=False)
    profile_photo_privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='everyone')
    read_receipt_privacy = models.BooleanField(default=True)
    group_add_privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='everyone')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
