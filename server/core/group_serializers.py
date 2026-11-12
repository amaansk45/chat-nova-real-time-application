from rest_framework import serializers
from .models import (
    User, Conversation, ConversationMember, Group,
    GroupAdmin, GroupPoll, GroupPollOption, GroupPollVote
)
from .social_serializers import ContactUserSerializer

class GroupPollOptionSerializer(serializers.ModelSerializer):
    votes_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = GroupPollOption
        fields = ['id', 'text', 'votes_count', 'has_voted']

    def get_votes_count(self, obj):
        return obj.votes.count()

    def get_has_voted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.votes.filter(user=request.user).exists()
        return False


class GroupPollSerializer(serializers.ModelSerializer):
    options = GroupPollOptionSerializer(many=True, read_only=True)
    creator = ContactUserSerializer(read_only=True)
    total_votes = serializers.SerializerMethodField()

    class Meta:
        model = GroupPoll
        fields = ['id', 'conversation_id', 'creator', 'question', 'is_multiple_choice', 'is_closed', 'options', 'total_votes', 'created_at']

    def get_total_votes(self, obj):
        return GroupPollVote.objects.filter(option__poll=obj).count()


class CreateGroupPollSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=300, required=True)
    options = serializers.ListField(child=serializers.CharField(max_length=200), min_length=2, max_length=10)
    is_multiple_choice = serializers.BooleanField(default=False)


class GroupMemberItemSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)

    class Meta:
        model = ConversationMember
        fields = ['id', 'user', 'role', 'joined_at', 'is_pinned', 'is_muted']


class GroupDetailsSerializer(serializers.ModelSerializer):
    members = GroupMemberItemSerializer(many=True, read_only=True)
    creator = ContactUserSerializer(source='created_by', read_only=True)
    is_announcement_only = serializers.BooleanField(source='group_details.is_announcement_only', read_only=True)
    only_admins_can_edit_info = serializers.BooleanField(source='group_details.only_admins_can_edit_info', read_only=True)
    only_admins_can_invite = serializers.BooleanField(source='group_details.only_admins_can_invite', read_only=True)
    invite_link_token = serializers.CharField(source='group_details.invite_link_token', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'description', 'avatar', 'type', 'creator',
            'is_announcement_only', 'only_admins_can_edit_info', 'only_admins_can_invite',
            'invite_link_token', 'members', 'created_at', 'updated_at'
        ]


class CreateGroupSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, required=False, default='')
    name = serializers.CharField(max_length=200, required=False, default='')
    description = serializers.CharField(required=False, allow_blank=True, default='')
    member_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)

    def validate(self, attrs):
        title = attrs.get('title') or attrs.get('name')
        if not title:
            raise serializers.ValidationError({'name': 'Group title or name is required.'})
        attrs['title'] = title
        return attrs


class GroupPermissionsSerializer(serializers.Serializer):
    is_announcement_only = serializers.BooleanField(required=False)
    only_admins_can_edit_info = serializers.BooleanField(required=False)
    only_admins_can_invite = serializers.BooleanField(required=False)
