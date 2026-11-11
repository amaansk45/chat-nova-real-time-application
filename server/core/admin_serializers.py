from rest_framework import serializers
from .models import User, Conversation, Message, Call, Report
from .social_serializers import ContactUserSerializer
from .chat_serializers import MessageSerializer

class AdminOverviewStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    inactive_users = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    total_conversations = serializers.IntegerField()
    total_calls = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    storage_attachments_count = serializers.IntegerField()


class AdminUserListSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 'first_name',
            'last_name', 'avatar_url', 'is_active', 'is_verified',
            'is_2fa_enabled', 'is_staff', 'is_online', 'last_seen', 'created_at'
        ]

    def get_avatar_url(self, obj):
        try:
            if obj.profile.avatar:
                return obj.profile.avatar.url
        except Exception:
            pass
        return None


class AdminUserActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['suspend', 'activate', 'verify', 'make_staff', 'remove_staff'])


class AdminGroupListSerializer(serializers.ModelSerializer):
    creator = ContactUserSerializer(source='created_by', read_only=True)
    members_count = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'type', 'description', 'creator', 'members_count', 'messages_count', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.members.count()

    def get_messages_count(self, obj):
        return obj.messages.count()


class AdminReportItemSerializer(serializers.ModelSerializer):
    reporter = ContactUserSerializer(read_only=True)
    reported_user = ContactUserSerializer(read_only=True)
    reported_message = MessageSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reported_user', 'reported_message',
            'reported_conversation_id', 'reason', 'description',
            'status', 'admin_notes', 'created_at'
        ]


class AdminResolveReportSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['resolved', 'dismissed', 'reviewed'])
    admin_notes = serializers.CharField(required=False, allow_blank=True, default='')
    suspend_user = serializers.BooleanField(required=False, default=False)
    delete_message = serializers.BooleanField(required=False, default=False)
