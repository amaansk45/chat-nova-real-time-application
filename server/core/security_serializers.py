from rest_framework import serializers
from .models import MessageEncryptionKey, BlockedUser, Report, User
from .social_serializers import ContactUserSerializer

class MessageEncryptionKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageEncryptionKey
        fields = [
            'device_id', 'public_identity_key', 'public_pre_key',
            'signed_pre_key', 'signature', 'updated_at'
        ]


class UserKeyBundleSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    username = serializers.CharField()
    devices = MessageEncryptionKeySerializer(many=True)


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked = ContactUserSerializer(read_only=True)

    class Meta:
        model = BlockedUser
        fields = ['id', 'blocked', 'reason', 'created_at']


class BlockUserActionSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class ReportSerializer(serializers.ModelSerializer):
    reporter = ContactUserSerializer(read_only=True)
    reported_user = ContactUserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reported_user', 'reported_message_id',
            'reported_conversation_id', 'reason', 'description', 'status', 'created_at'
        ]


class SubmitReportSerializer(serializers.Serializer):
    reported_user_id = serializers.UUIDField(required=False, allow_null=True)
    reported_message_id = serializers.UUIDField(required=False, allow_null=True)
    reported_conversation_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.ChoiceField(
        choices=['spam', 'harassment', 'inappropriate_content', 'impersonation', 'scam', 'other'],
        default='spam'
    )
    description = serializers.CharField(required=False, allow_blank=True, default='')


class DisappearingMessagesConfigSerializer(serializers.Serializer):
    duration_seconds = serializers.IntegerField(required=True, min_value=0)
