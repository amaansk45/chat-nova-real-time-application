from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from .models import (
    User, UserStatus, StatusView, StatusReaction,
    Contact, Conversation, ConversationMember, Message
)
from .status_serializers import (
    UserStatusItemSerializer, CreateStatusSerializer,
    StatusViewSerializer, StatusReactionSerializer
)
from .social_serializers import ContactUserSerializer
from .chat_serializers import MessageSerializer

class StatusFeedAPIView(APIView):
    """Retrieve active 24-hour stories grouped by user (my stories & contacts)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        user = request.user

        # Get contacts
        contact_ids = list(Contact.objects.filter(user=user, is_blocked=False).values_list('contact_id', flat=True))
        all_user_ids = [user.id] + contact_ids

        # Fetch active stories
        active_statuses = UserStatus.objects.filter(
            user_id__in=all_user_ids,
            expires_at__gt=now
        ).select_related('user', 'user__profile').prefetch_related(
            'views', 'reactions', 'reactions__user', 'allowed_viewers', 'excluded_viewers'
        ).order_by('created_at')

        # Filter by privacy rules
        visible_statuses = []
        for s in active_statuses:
            if s.user == user:
                visible_statuses.append(s)
            elif s.privacy == 'everyone':
                visible_statuses.append(s)
            elif s.privacy == 'contacts':
                if not s.excluded_viewers.filter(id=user.id).exists():
                    visible_statuses.append(s)
            elif s.privacy == 'custom':
                if s.allowed_viewers.filter(id=user.id).exists():
                    visible_statuses.append(s)

        # Group by author
        user_grouped = {}
        for s in visible_statuses:
            u_id = str(s.user_id)
            if u_id not in user_grouped:
                user_grouped[u_id] = {
                    'user': ContactUserSerializer(s.user).data,
                    'is_me': (s.user_id == user.id),
                    'statuses': [],
                    'has_unviewed': False,
                    'last_updated': s.created_at,
                }
            
            serialized_status = UserStatusItemSerializer(s, context={'request': request}).data
            user_grouped[u_id]['statuses'].append(serialized_status)
            if not serialized_status['has_viewed'] and s.user_id != user.id:
                user_grouped[u_id]['has_unviewed'] = True
            if s.created_at > user_grouped[u_id]['last_updated']:
                user_grouped[u_id]['last_updated'] = s.created_at

        feed = list(user_grouped.values())
        # Sort with own story first, then unviewed stories, then viewed
        feed.sort(key=lambda x: (not x['is_me'], not x['has_unviewed'], x['last_updated']), reverse=False)

        return Response(feed)


class CreateStatusAPIView(APIView):
    """Post a new 24-hour story (text canvas, photo, or video)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateStatusSerializer(data=request.data)
        if serializer.is_valid():
            allowed_ids = serializer.validated_data.pop('allowed_viewer_ids', [])
            excluded_ids = serializer.validated_data.pop('excluded_viewer_ids', [])

            status_obj = UserStatus.objects.create(
                user=request.user,
                expires_at=timezone.now() + timezone.timedelta(hours=24),
                **serializer.validated_data
            )

            if allowed_ids:
                status_obj.allowed_viewers.set(allowed_ids)
            if excluded_ids:
                status_obj.excluded_viewers.set(excluded_ids)

            return Response(UserStatusItemSerializer(status_obj, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StatusDetailAPIView(APIView):
    """Retrieve single story or delete own story."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, status_id):
        status_obj = UserStatus.objects.filter(id=status_id, expires_at__gt=timezone.now()).first()
        if not status_obj:
            return Response({'detail': 'Story not found or expired.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserStatusItemSerializer(status_obj, context={'request': request}).data)

    def delete(self, request, status_id):
        deleted, _ = UserStatus.objects.filter(id=status_id, user=request.user).delete()
        if deleted:
            return Response({'message': 'Story deleted successfully.'})
        return Response({'detail': 'Story not found.'}, status=status.HTTP_404_NOT_FOUND)


class RecordStatusViewAPIView(APIView):
    """Register viewer for a story."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, status_id):
        status_obj = UserStatus.objects.filter(id=status_id, expires_at__gt=timezone.now()).first()
        if not status_obj:
            return Response({'detail': 'Story not found.'}, status=status.HTTP_404_NOT_FOUND)

        if status_obj.user != request.user:
            StatusView.objects.get_or_create(status=status_obj, viewer=request.user)

        return Response({'status': 'view_recorded'})


class StatusReactionAPIView(APIView):
    """React to a user's story with emoji."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, status_id):
        status_obj = UserStatus.objects.filter(id=status_id, expires_at__gt=timezone.now()).first()
        if not status_obj:
            return Response({'detail': 'Story not found.'}, status=status.HTTP_404_NOT_FOUND)

        emoji = request.data.get('emoji', '❤️')
        reaction, created = StatusReaction.objects.get_or_create(
            status=status_obj, user=request.user, emoji=emoji
        )
        return Response({'status': 'reacted', 'emoji': emoji})


class ReplyToStatusAPIView(APIView):
    """Send a direct message replying to an active story."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, status_id):
        status_obj = UserStatus.objects.filter(id=status_id, expires_at__gt=timezone.now()).first()
        if not status_obj:
            return Response({'detail': 'Story not found.'}, status=status.HTTP_404_NOT_FOUND)

        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({'detail': 'Message text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create 1-on-1 direct conversation with the story author
        author = status_obj.user
        conv = Conversation.objects.filter(
            type='direct',
            members__user=request.user
        ).filter(
            members__user=author
        ).first()

        if not conv:
            conv = Conversation.objects.create(type='direct', created_by=request.user)
            ConversationMember.objects.create(conversation=conv, user=request.user, role='owner')
            ConversationMember.objects.create(conversation=conv, user=author, role='member')

        # Create message referencing the story
        story_preview = status_obj.caption or status_obj.text_content or f"{status_obj.media_type.capitalize()} Story"
        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=f"💬 Replied to story ({story_preview}): {message_text}",
            message_type='text',
            metadata={
                'replied_story_id': str(status_obj.id),
                'story_type': status_obj.media_type,
            }
        )

        conv.save(update_fields=['updated_at'])
        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)
