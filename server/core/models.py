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


class Contact(models.Model):
    """
    User contacts with nickname, favorite, and blocking indicators.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    contact = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contact_of')
    nickname = models.CharField(max_length=100, blank=True)
    is_favorite = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'contact')
        ordering = ['nickname', 'contact__username']

    def __str__(self):
        return f"{self.user.username} -> {self.contact.username}"


class ContactSync(models.Model):
    """
    Hashed phonebook entries for contact synchronization.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='synced_contacts')
    phone_hash = models.CharField(max_length=64, db_index=True)
    contact_name = models.CharField(max_length=150)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['user', 'phone_hash'])]

    def __str__(self):
        return f"{self.user.username}: {self.contact_name}"


class Conversation(models.Model):
    """
    Core conversation entity supporting direct chats, group chats, and broadcast channels.
    """
    TYPE_CHOICES = [
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
        ('channel', 'Broadcast Channel'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='direct', db_index=True)
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='conversation_avatars/', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_conversations')
    
    is_archived_by = models.ManyToManyField(User, related_name='archived_conversations', blank=True)
    is_muted_by = models.ManyToManyField(User, related_name='muted_conversations', blank=True)
    
    # Disappearing messages timer (seconds: 0=disabled, 86400=24h, 604800=7d, 7776000=90d)
    disappearing_messages_duration = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class ConversationMember(models.Model):
    """
    Membership linking a user to a conversation with specific roles and preferences.
    """
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('member', 'Member'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversation_memberships')
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='member')
    
    joined_at = models.DateTimeField(auto_now_add=True)
    is_pinned = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    custom_wallpaper = models.CharField(max_length=255, blank=True)
    unread_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('conversation', 'user')
        indexes = [
            models.Index(fields=['conversation', 'user']),
            models.Index(fields=['user', 'is_pinned']),
        ]

    def __str__(self):
        return f"{self.user.username} in {self.conversation.title or self.conversation.id} ({self.role})"


class Message(models.Model):
    """
    Message model supporting diverse content types, threading, reactions,
    disappearing timers, forwarding, and soft-deletion.
    """
    TYPE_CHOICES = [
        ('text', 'Text Message'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('voice', 'Voice Note'),
        ('document', 'Document'),
        ('location', 'Location Pin'),
        ('contact', 'Contact Card'),
        ('poll', 'Poll'),
        ('system', 'System Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    message_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    
    content = models.TextField(blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    forward_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forwards')
    
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    is_deleted_for_everyone = models.BooleanField(default=False)
    deleted_for_users = models.ManyToManyField(User, related_name='deleted_messages', blank=True)
    
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)
    is_starred_by = models.ManyToManyField(User, related_name='starred_messages', blank=True)
    
    # Flexible structured payload (coordinates, vCard info, call logs, poll reference)
    metadata = models.JSONField(default=dict, blank=True)
    
    disappears_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['disappears_at']),
        ]

    def __str__(self):
        return f"Msg {self.id} in {self.conversation_id} by {self.sender_id}"


class MessageReceipt(models.Model):
    """
    Message delivery and read receipt timestamps per recipient.
    """
    STATUS_CHOICES = [
        ('sent', 'Sent to Server'),
        ('delivered', 'Delivered to Device'),
        ('read', 'Read by Recipient'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_receipts')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='sent')
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('message', 'user', 'status')
        indexes = [
            models.Index(fields=['message', 'user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.message_id} ({self.status})"
