from rest_framework import serializers
from .models import (
    User, Conversation, ConversationMember, Message,
    MessageReceipt, MessageReaction, Attachment, ScheduledMessage, MessageDraft
)
from .social_serializers import ContactUserSerializer

class MessageReactionSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)

    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'user', 'created_at']


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            'id', 'file', 'file_url', 'file_name', 'file_size',
            'file_type', 'media_type', 'thumbnail', 'thumbnail_url',
            'duration', 'waveform_data', 'created_at'
        ]

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None

    def get_thumbnail_url(self, obj):
        return obj.thumbnail.url if obj.thumbnail else None


class ReplyMessageSerializer(serializers.ModelSerializer):
    sender = ContactUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'message_type', 'content', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = ContactUserSerializer(read_only=True)
    reply_to = ReplyMessageSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    is_starred = serializers.SerializerMethodField()
    delivery_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation_id', 'sender', 'message_type', 'content',
            'reply_to', 'forward_from_id', 'is_edited', 'edited_at',
            'is_deleted_for_everyone', 'is_pinned', 'pinned_at',
            'is_starred', 'delivery_status', 'reactions', 'attachments',
            'metadata', 'disappears_at', 'created_at', 'updated_at'
        ]

    def get_is_starred(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_starred_by.filter(id=request.user.id).exists()
        return False

    def get_delivery_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or obj.sender != request.user:
            return 'sent'
        receipts = obj.receipts.all()
        if receipts.filter(status='read').exists():
            return 'read'
        if receipts.filter(status='delivered').exists():
            return 'delivered'
        return 'sent'


class SendMessageSerializer(serializers.ModelSerializer):
    reply_to_id = serializers.UUIDField(required=False, allow_null=True)
    forward_from_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Message
        fields = ['content', 'message_type', 'reply_to_id', 'forward_from_id', 'metadata']


class ConversationMemberSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['id', 'user', 'role', 'joined_at', 'is_pinned', 'is_muted', 'is_archived', 'unread_count']


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()
    display_avatar = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'type', 'display_title', 'display_avatar',
            'last_message', 'unread_count', 'is_pinned', 'is_muted',
            'is_archived', 'other_participant', 'updated_at'
        ]

    def get_membership(self, obj):
        request = self.context.get('request')
        if not hasattr(obj, '_cached_membership'):
            if request and request.user.is_authenticated:
                obj._cached_membership = obj.members.filter(user=request.user).first()
            else:
                obj._cached_membership = None
        return obj._cached_membership

    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted_for_everyone=False).order_by('-created_at').first()
        if last_msg:
            return {
                'id': str(last_msg.id),
                'content': last_msg.content,
                'message_type': last_msg.message_type,
                'sender_username': last_msg.sender.username if last_msg.sender else 'System',
                'created_at': last_msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        mem = self.get_membership(obj)
        return mem.unread_count if mem else 0

    def get_is_pinned(self, obj):
        mem = self.get_membership(obj)
        return mem.is_pinned if mem else False

    def get_is_muted(self, obj):
        mem = self.get_membership(obj)
        return mem.is_muted if mem else False

    def get_is_archived(self, obj):
        mem = self.get_membership(obj)
        return mem.is_archived if mem else False

    def get_other_participant(self, obj):
        if obj.type == 'direct':
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                other_mem = obj.members.exclude(user=request.user).select_related('user', 'user__profile').first()
                if other_mem and other_mem.user:
                    return ContactUserSerializer(other_mem.user).data
        return None

    def get_display_title(self, obj):
        if obj.type == 'direct':
            other = self.get_other_participant(obj)
            if other:
                return other.get('first_name') or other.get('username') or 'Direct Chat'
        return obj.title or 'Conversation'

    def get_display_avatar(self, obj):
        if obj.type == 'direct':
            other = self.get_other_participant(obj)
            if other and other.get('avatar_url'):
                return other.get('avatar_url')
        return obj.avatar.url if obj.avatar else None


class ConversationDetailSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(many=True, read_only=True)
    pinned_messages = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'type', 'title', 'description', 'avatar',
            'created_by', 'members', 'pinned_messages',
            'disappearing_messages_duration', 'created_at', 'updated_at'
        ]

    def get_pinned_messages(self, obj):
        pinned = obj.messages.filter(is_pinned=True, is_deleted_for_everyone=False)
        return MessageSerializer(pinned, many=True, context=self.context).data


class CreateDirectChatSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField(required=True)


class ScheduledMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledMessage
        fields = ['id', 'conversation', 'content', 'scheduled_for', 'is_sent', 'sent_at', 'created_at']
        read_only_fields = ['id', 'is_sent', 'sent_at', 'created_at']


class MessageDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageDraft
        fields = ['id', 'conversation', 'content', 'updated_at']
        read_only_fields = ['id', 'updated_at']
