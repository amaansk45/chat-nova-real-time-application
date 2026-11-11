from rest_framework import serializers
from .models import User, UserProfile, Contact, ContactSync, PersonalNote

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_online = serializers.BooleanField(source='user.is_online', read_only=True)
    last_seen = serializers.DateTimeField(source='user.last_seen', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'phone_number', 'first_name', 'last_name',
            'bio', 'avatar', 'cover_image', 'status_message',
            'hide_last_seen', 'hide_online_status', 'profile_photo_privacy',
            'read_receipt_privacy', 'group_add_privacy', 'is_online', 'last_seen',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContactUserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'first_name', 'last_name', 'avatar_url', 'bio', 'is_online', 'last_seen']

    def get_avatar_url(self, obj):
        try:
            profile = obj.profile
            if profile.profile_photo_privacy == 'nobody':
                return None
            if profile.avatar:
                return profile.avatar.url
        except Exception:
            pass
        return None

    def get_bio(self, obj):
        try:
            return obj.profile.bio
        except Exception:
            return ""

    def get_is_online(self, obj):
        try:
            if obj.profile.hide_online_status:
                return False
            return obj.is_online
        except Exception:
            return obj.is_online

    def get_last_seen(self, obj):
        try:
            if obj.profile.hide_last_seen:
                return None
            return obj.last_seen
        except Exception:
            return obj.last_seen


class ContactSerializer(serializers.ModelSerializer):
    contact = ContactUserSerializer(read_only=True)
    contact_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Contact
        fields = ['id', 'contact', 'contact_id', 'nickname', 'is_favorite', 'is_blocked', 'created_at']
        read_only_fields = ['id', 'created_at']


class AddContactByIdentifierSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Email, Phone Number, or Username")
    nickname = serializers.CharField(required=False, allow_blank=True)


class ContactSyncSerializer(serializers.Serializer):
    contacts = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text="List of { 'phone_hash': '...', 'name': '...' }"
    )


class PersonalNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalNote
        fields = ['id', 'title', 'content', 'color', 'is_pinned', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSearchSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.CharField(source='profile.bio', read_only=True)
    is_contact = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'bio', 'is_online', 'is_contact']

    def get_avatar_url(self, obj):
        try:
            if obj.profile.avatar:
                return obj.profile.avatar.url
        except Exception:
            pass
        return None

    def get_is_contact(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Contact.objects.filter(user=request.user, contact=obj).exists()
        return False
