from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, UserProfile, Contact, ContactSync,
    Conversation, ConversationMember, Message, MessageReceipt,
    MessageReaction, Attachment, Group, GroupAdmin,
    GroupPoll, GroupPollOption, GroupPollVote,
    UserStatus, StatusView, StatusReaction,
    Call, CallParticipant, Notification, BlockedUser,
    Report, Device, UserSession, MessageEncryptionKey,
    ScheduledMessage, PersonalNote, MessageDraft
)

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('email', 'username', 'phone_number', 'is_verified', 'is_2fa_enabled', 'is_online', 'last_seen', 'is_staff')
    list_filter = ('is_verified', 'is_2fa_enabled', 'is_online', 'is_staff', 'is_superuser')
    search_fields = ('email', 'username', 'phone_number')
    ordering = ('-created_at',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('username', 'first_name', 'last_name', 'phone_number')}),
        ('Verification & 2FA', {'fields': ('is_verified', 'is_2fa_enabled', 'two_factor_secret', 'otp_code', 'otp_expires_at')}),
        ('Presence', {'fields': ('is_online', 'last_seen')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_seen')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'status_message', 'hide_last_seen', 'hide_online_status', 'read_receipt_privacy')
    search_fields = ('user__username', 'user__email', 'bio')

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('user', 'contact', 'nickname', 'is_favorite', 'is_blocked', 'created_at')
    list_filter = ('is_favorite', 'is_blocked')
    search_fields = ('user__username', 'contact__username', 'nickname')

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'created_by', 'created_at', 'updated_at')
    list_filter = ('type',)
    search_fields = ('title', 'description')

@admin.register(ConversationMember)
class ConversationMemberAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'user', 'role', 'is_pinned', 'is_muted', 'is_archived', 'unread_count')
    list_filter = ('role', 'is_pinned', 'is_muted', 'is_archived')
    search_fields = ('user__username', 'conversation__title')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'message_type', 'is_edited', 'is_pinned', 'created_at')
    list_filter = ('message_type', 'is_edited', 'is_pinned', 'is_deleted_for_everyone')
    search_fields = ('content', 'sender__username', 'conversation__title')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(MessageReceipt)
class MessageReceiptAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'status', 'timestamp')
    list_filter = ('status',)

@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'emoji', 'created_at')
    search_fields = ('user__username', 'emoji')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'media_type', 'file_size', 'created_at')
    list_filter = ('media_type',)
    search_fields = ('file_name',)

@admin.register(Group)
class GroupAdminConfig(admin.ModelAdmin):
    list_display = ('conversation', 'is_announcement_only', 'only_admins_can_edit_info')

@admin.register(UserStatus)
class UserStatusAdmin(admin.ModelAdmin):
    list_display = ('user', 'media_type', 'privacy', 'expires_at', 'created_at')
    list_filter = ('media_type', 'privacy')

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('caller', 'call_type', 'status', 'started_at', 'duration_seconds')
    list_filter = ('call_type', 'status')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'sender', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'reported_user', 'reason', 'status', 'created_at')
    list_filter = ('reason', 'status')

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'device_type', 'browser', 'os', 'is_active', 'last_active')
    list_filter = ('device_type', 'is_active')

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'device', 'ip_address', 'expires_at', 'is_revoked', 'created_at')
    list_filter = ('is_revoked',)

@admin.register(MessageEncryptionKey)
class MessageEncryptionKeyAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_id', 'created_at', 'updated_at')

@admin.register(ScheduledMessage)
class ScheduledMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'scheduled_for', 'is_sent', 'sent_at')
    list_filter = ('is_sent',)

@admin.register(PersonalNote)
class PersonalNoteAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'is_pinned', 'updated_at')
    list_filter = ('is_pinned',)
