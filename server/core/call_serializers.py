from rest_framework import serializers
from .models import Call, CallParticipant, User
from .social_serializers import ContactUserSerializer

class CallParticipantSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)

    class Meta:
        model = CallParticipant
        fields = [
            'id', 'user', 'role', 'status', 'joined_at',
            'left_at', 'is_muted', 'is_camera_off', 'is_screen_sharing'
        ]


class CallSerializer(serializers.ModelSerializer):
    caller = ContactUserSerializer(read_only=True)
    participants = CallParticipantSerializer(many=True, read_only=True)
    is_outgoing = serializers.SerializerMethodField()

    class Meta:
        model = Call
        fields = [
            'id', 'caller', 'conversation_id', 'call_type', 'status',
            'room_id', 'started_at', 'ended_at', 'duration_seconds',
            'participants', 'is_outgoing', 'created_at'
        ]

    def get_is_outgoing(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.caller_id == request.user.id
        return False


class InitiateCallSerializer(serializers.Serializer):
    recipient_id = serializers.UUIDField(required=False, allow_null=True)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    call_type = serializers.ChoiceField(choices=['audio', 'video', 'group'], default='audio')


class CallActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['accept', 'reject', 'end', 'miss'])
    duration_seconds = serializers.IntegerField(required=False, default=0)
