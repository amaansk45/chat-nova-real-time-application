from rest_framework import serializers
from .models import User, UserStatus, StatusView, StatusReaction
from .social_serializers import ContactUserSerializer

class StatusViewSerializer(serializers.ModelSerializer):
    viewer = ContactUserSerializer(read_only=True)

    class Meta:
        model = StatusView
        fields = ['id', 'viewer', 'viewed_at']


class StatusReactionSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)

    class Meta:
        model = StatusReaction
        fields = ['id', 'user', 'emoji', 'created_at']


class UserStatusItemSerializer(serializers.ModelSerializer):
    user = ContactUserSerializer(read_only=True)
    media_url = serializers.SerializerMethodField()
    views_count = serializers.SerializerMethodField()
    viewers = serializers.SerializerMethodField()
    reactions = StatusReactionSerializer(many=True, read_only=True)
    has_viewed = serializers.SerializerMethodField()

    class Meta:
        model = UserStatus
        fields = [
            'id', 'user', 'media_type', 'media_file', 'media_url',
            'text_content', 'background_color', 'font_style', 'caption',
            'privacy', 'expires_at', 'created_at', 'views_count', 'viewers',
            'reactions', 'has_viewed'
        ]

    def get_media_url(self, obj):
        return obj.media_file.url if obj.media_file else None

    def get_views_count(self, obj):
        return obj.views.count()

    def get_viewers(self, obj):
        request = self.context.get('request')
        # Only creator can see full viewer list
        if request and request.user.id == obj.user_id:
            views = obj.views.select_related('viewer', 'viewer__profile')[:50]
            return StatusViewSerializer(views, many=True).data
        return []

    def get_has_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.views.filter(viewer=request.user).exists()
        return False


class CreateStatusSerializer(serializers.ModelSerializer):
    allowed_viewer_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    excluded_viewer_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)

    class Meta:
        model = UserStatus
        fields = [
            'media_type', 'media_file', 'text_content',
            'background_color', 'font_style', 'caption',
            'privacy', 'allowed_viewer_ids', 'excluded_viewer_ids'
        ]


class UserStatusFeedGroupSerializer(serializers.Serializer):
    user = ContactUserSerializer()
    statuses = UserStatusItemSerializer(many=True)
    has_unviewed = serializers.BooleanField()
    last_updated = serializers.DateTimeField()
