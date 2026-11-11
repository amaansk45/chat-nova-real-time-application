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


class MessageReaction(models.Model):
    """
    Emoji reaction associated with a message.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reactions')
    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')
        indexes = [models.Index(fields=['message', 'emoji'])]

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} on {self.message_id}"


class Attachment(models.Model):
    """
    Media or document attachment linked to a chat message.
    """
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('voice', 'Voice Note'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=100)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default='other')
    
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/%d/', blank=True, null=True)
    duration = models.FloatField(blank=True, null=True)
    waveform_data = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.file_name} ({self.media_type})"


class Group(models.Model):
    """
    Extended group profile and permission control linked to Conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.OneToOneField(Conversation, on_delete=models.CASCADE, related_name='group_details')
    is_announcement_only = models.BooleanField(default=False)
    only_admins_can_edit_info = models.BooleanField(default=True)
    only_admins_can_invite = models.BooleanField(default=False)
    
    invite_link_token = models.CharField(max_length=64, unique=True, blank=True, null=True, db_index=True)
    invite_link_expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Group {self.conversation.title}"


class GroupAdmin(models.Model):
    """
    Granular permission assignments for group administrators.
    """
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='admins')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='administered_groups')
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='admin')
    
    can_change_info = models.BooleanField(default=True)
    can_delete_messages = models.BooleanField(default=True)
    can_ban_users = models.BooleanField(default=True)
    can_invite_users = models.BooleanField(default=True)
    can_pin_messages = models.BooleanField(default=True)
    can_manage_admins = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('group', 'user')

    def __str__(self):
        return f"{self.user.username} ({self.role}) in {self.group.conversation.title}"


class GroupPoll(models.Model):
    """
    Interactive polling inside group conversations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='polls')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_polls')
    question = models.CharField(max_length=300)
    is_multiple_choice = models.BooleanField(default=False)
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question


class GroupPollOption(models.Model):
    """
    Option choices for a group poll.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(GroupPoll, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=200)

    def __str__(self):
        return self.text


class GroupPollVote(models.Model):
    """
    User vote cast on a poll option.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    option = models.ForeignKey(GroupPollOption, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='poll_votes')
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('option', 'user')

    def __str__(self):
        return f"{self.user.username} voted for {self.option.text}"


def default_status_expiration():
    return timezone.now() + timezone.timedelta(hours=24)

class UserStatus(models.Model):
    """
    Stories / 24-hour disappearing status updates.
    """
    MEDIA_TYPE_CHOICES = [
        ('text', 'Text Story'),
        ('image', 'Photo Story'),
        ('video', 'Video Story'),
    ]

    PRIVACY_CHOICES = [
        ('everyone', 'All Contacts'),
        ('contacts', 'My Contacts Except...'),
        ('custom', 'Only Share With...'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='statuses')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='text')
    media_file = models.FileField(upload_to='stories/%Y/%m/%d/', blank=True, null=True)
    
    text_content = models.TextField(blank=True)
    background_color = models.CharField(max_length=30, default='#080D19')
    font_style = models.CharField(max_length=30, default='sans')
    caption = models.CharField(max_length=255, blank=True)
    
    privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='everyone')
    allowed_viewers = models.ManyToManyField(User, related_name='visible_custom_statuses', blank=True)
    excluded_viewers = models.ManyToManyField(User, related_name='hidden_from_statuses', blank=True)
    
    expires_at = models.DateTimeField(default=default_status_expiration, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'expires_at']),
        ]

    def is_active(self):
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"{self.user.username}'s Story ({self.media_type})"


class StatusView(models.Model):
    """
    Tracking contacts who viewed a status story.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.ForeignKey(UserStatus, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='status_views')
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('status', 'viewer')
        ordering = ['-viewed_at']

    def __str__(self):
        return f"{self.viewer.username} viewed {self.status.id}"


class StatusReaction(models.Model):
    """
    Quick emoji reaction on a user's story.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.ForeignKey(UserStatus, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='status_reactions')
    emoji = models.CharField(max_length=16)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('status', 'user', 'emoji')

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} on story {self.status_id}"


class Call(models.Model):
    """
    Audio and video WebRTC call records, including 1-on-1 and group calls.
    """
    CALL_TYPE_CHOICES = [
        ('audio', 'Audio Call'),
        ('video', 'Video Call'),
        ('group', 'Group Video Call'),
    ]

    STATUS_CHOICES = [
        ('ringing', 'Ringing'),
        ('active', 'In Progress'),
        ('ended', 'Ended Normally'),
        ('rejected', 'Call Declined'),
        ('missed', 'Missed Call'),
        ('busy', 'Line Busy'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_calls')
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='calls')
    call_type = models.CharField(max_length=15, choices=CALL_TYPE_CHOICES, default='audio')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ringing')
    room_id = models.CharField(max_length=64, unique=True, db_index=True)
    
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.call_type} call from {self.caller.username} ({self.status})"


class CallParticipant(models.Model):
    """
    Participant state inside an active or concluded WebRTC call.
    """
    ROLE_CHOICES = [
        ('caller', 'Caller'),
        ('receiver', 'Receiver'),
    ]

    STATUS_CHOICES = [
        ('invited', 'Invited'),
        ('joined', 'Joined'),
        ('declined', 'Declined'),
        ('left', 'Left'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='call_participations')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='receiver')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='invited')
    
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    is_camera_off = models.BooleanField(default=False)
    is_screen_sharing = models.BooleanField(default=False)

    class Meta:
        unique_together = ('call', 'user')

    def __str__(self):
        return f"{self.user.username} in call {self.call_id}"


class Notification(models.Model):
    """
    In-app alerts and push notification records.
    """
    TYPE_CHOICES = [
        ('message', 'New Message'),
        ('call', 'Incoming Call'),
        ('missed_call', 'Missed Call'),
        ('reaction', 'Message Reaction'),
        ('mention', 'Mentioned in Group'),
        ('group_invite', 'Group Invitation'),
        ('story_view', 'Story Viewed'),
        ('system', 'System Alert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='message')
    title = models.CharField(max_length=200)
    message = models.TextField()
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_notifications')
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.title}"


class BlockedUser(models.Model):
    """
    Blocked accounts registry for safety and privacy.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by_users')
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"
