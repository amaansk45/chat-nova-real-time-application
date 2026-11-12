from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db import models
from django.db.models import Q, F
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import (
    User, Conversation, ConversationMember, Message,
    MessageReceipt, MessageReaction, Attachment, ScheduledMessage, MessageDraft
)
from .chat_serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, SendMessageSerializer, ScheduledMessageSerializer,
    MessageDraftSerializer, MessageReactionSerializer
)

channel_layer = get_channel_layer()

def find_recipient(identifier, current_user):
    """Smart lookup for users by username, email, email prefix, phone, name, or UUID."""
    if not identifier:
        return None
    raw = str(identifier).strip()
    
    # 1. Exact match by username, email, or phone
    recipient = User.objects.filter(
        Q(username__iexact=raw) |
        Q(email__iexact=raw) |
        Q(phone_number__iexact=raw)
    ).first()

    # 2. Match email prefix (e.g. "hasan" matches "hasan@gmail.com")
    if not recipient:
        recipient = User.objects.filter(
            Q(email__istartswith=f"{raw}@") |
            Q(email__icontains=raw)
        ).first()

    # 3. Match by first_name or last_name
    if not recipient:
        recipient = User.objects.filter(
            Q(first_name__iexact=raw) |
            Q(last_name__iexact=raw)
        ).first()

    # 4. Partial substring match
    if not recipient:
        recipient = User.objects.filter(
            Q(username__icontains=raw) |
            Q(first_name__icontains=raw)
        ).exclude(id=current_user.id).first()

    # 5. UUID match
    if not recipient:
        try:
            recipient = User.objects.filter(id=raw).first()
        except Exception:
            pass

    return recipient


class ConversationListCreateAPIView(APIView):
    """List user conversations by filter tab or initialize 1-on-1 direct chat."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        filter_type = request.query_params.get('filter', 'all') # 'all', 'direct', 'group', 'unread', 'archived'
        search_query = request.query_params.get('search', '').strip()

        # Conversations user belongs to
        memberships = ConversationMember.objects.filter(user=user)

        if filter_type == 'archived':
            memberships = memberships.filter(is_archived=True)
        else:
            memberships = memberships.filter(is_archived=False)

        if filter_type == 'direct':
            memberships = memberships.filter(conversation__type='direct')
        elif filter_type == 'group':
            memberships = memberships.filter(conversation__type__in=['group', 'channel'])
        elif filter_type == 'unread':
            memberships = memberships.filter(unread_count__gt=0)

        conv_ids = memberships.values_list('conversation_id', flat=True)
        conversations = Conversation.objects.filter(id__in=conv_ids).prefetch_related(
            'members', 'members__user', 'members__user__profile', 'messages'
        ).order_by('-updated_at')

        if search_query:
            conversations = conversations.filter(
                Q(title__icontains=search_query) |
                Q(members__user__username__icontains=search_query) |
                Q(members__user__first_name__icontains=search_query)
            ).distinct()

        serializer = ConversationListSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        ident = (
            request.data.get('recipient_id') or
            request.data.get('username_or_email') or
            request.data.get('identifier') or
            request.data.get('username') or ''
        )
        if not ident:
            return Response({'detail': 'Please provide a recipient username or email.'}, status=status.HTTP_400_BAD_REQUEST)

        recipient = find_recipient(ident, request.user)
        if not recipient:
            return Response({'detail': f'User "{ident}" not found. Please check the username or email.'}, status=status.HTTP_404_NOT_FOUND)

        if recipient.id == request.user.id:
            return Response({'detail': 'You cannot initiate a direct chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if 1-on-1 direct conversation already exists between these 2 users
        existing_conv = Conversation.objects.filter(
            type='direct',
            members__user=request.user
        ).filter(
            members__user=recipient
        ).first()

        if existing_conv:
            serializer = ConversationListSerializer(existing_conv, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Create new direct conversation
        conv = Conversation.objects.create(type='direct', created_by=request.user)
        ConversationMember.objects.create(conversation=conv, user=request.user, role='owner')
        ConversationMember.objects.create(conversation=conv, user=recipient, role='member')

        serializer = ConversationListSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DirectConversationAPIView(APIView):
    """Initialize or retrieve a 1-on-1 direct conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return ConversationListCreateAPIView().post(request)


class ConversationMuteToggleAPIView(APIView):
    """Toggle mute notifications for a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        membership = ConversationMember.objects.filter(conversation_id=conv_id, user=request.user).first()
        if not membership:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        membership.is_muted = not membership.is_muted
        membership.save(update_fields=['is_muted'])
        return Response({'is_muted': membership.is_muted})


class ConversationPinToggleAPIView(APIView):
    """Toggle pinned status for a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        membership = ConversationMember.objects.filter(conversation_id=conv_id, user=request.user).first()
        if not membership:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        membership.is_pinned = not membership.is_pinned
        membership.save(update_fields=['is_pinned'])
        return Response({'is_pinned': membership.is_pinned})


class ConversationArchiveToggleAPIView(APIView):
    """Toggle archived status for a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        membership = ConversationMember.objects.filter(conversation_id=conv_id, user=request.user).first()
        if not membership:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        membership.is_archived = not membership.is_archived
        membership.save(update_fields=['is_archived'])
        return Response({'is_archived': membership.is_archived})


class ConversationClearAPIView(APIView):
    """Clear chat messages history for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        for msg in conv.messages.all():
            msg.deleted_for_users.add(request.user)
        return Response({'detail': 'Chat history cleared successfully.'})


class ConversationDetailAPIView(APIView):
    """Retrieve conversation details, toggle mute/pin/archive, or leave."""
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self, conv_id, user):
        return Conversation.objects.filter(id=conv_id, members__user=user).first()

    def get(self, request, conv_id):
        conv = self.get_conversation(conv_id, request.user)
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Mark unread count as 0
        ConversationMember.objects.filter(conversation=conv, user=request.user).update(unread_count=0)

        serializer = ConversationDetailSerializer(conv, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, conv_id):
        conv = self.get_conversation(conv_id, request.user)
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        membership = ConversationMember.objects.filter(conversation=conv, user=request.user).first()
        if not membership:
            return Response({'detail': 'Membership not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'is_pinned' in request.data:
            membership.is_pinned = request.data['is_pinned']
        if 'is_muted' in request.data:
            membership.is_muted = request.data['is_muted']
        if 'is_archived' in request.data:
            membership.is_archived = request.data['is_archived']
        if 'custom_wallpaper' in request.data:
            membership.custom_wallpaper = request.data['custom_wallpaper']

        membership.save()

        # If admin/owner, allow updating title, description, disappearing messages
        if membership.role in ['owner', 'admin']:
            if 'title' in request.data:
                conv.title = request.data['title']
            if 'description' in request.data:
                conv.description = request.data['description']
            if 'disappearing_messages_duration' in request.data:
                conv.disappearing_messages_duration = int(request.data['disappearing_messages_duration'])
            conv.save()

        return Response(ConversationDetailSerializer(conv, context={'request': request}).data)

    def delete(self, request, conv_id):
        conv = self.get_conversation(conv_id, request.user)
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Leave conversation
        ConversationMember.objects.filter(conversation=conv, user=request.user).delete()
        if conv.members.count() == 0:
            conv.delete()

        return Response({'message': 'Left conversation successfully.'}, status=status.HTTP_200_OK)


class MessageListCreateAPIView(APIView):
    """List messages with pagination and post new messages."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conv_id):
        user = request.user
        conv = Conversation.objects.filter(id=conv_id, members__user=user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        limit = int(request.query_params.get('limit', 50))
        before_id = request.query_params.get('before_id')

        messages_qs = conv.messages.exclude(deleted_for_users=user).select_related(
            'sender', 'sender__profile', 'reply_to', 'reply_to__sender'
        ).prefetch_related('reactions', 'reactions__user', 'attachments', 'receipts')

        if before_id:
            ref_msg = Message.objects.filter(id=before_id).first()
            if ref_msg:
                messages_qs = messages_qs.filter(created_at__lt=ref_msg.created_at)

        messages = list(messages_qs.order_by('-created_at')[:limit])
        messages.reverse() # chronological order for chat view

        # Mark unread messages as read
        unread_messages = [m for m in messages if m.sender != user]
        if unread_messages:
            for m in unread_messages:
                MessageReceipt.objects.update_or_create(
                    message=m,
                    user=user,
                    status='read',
                    defaults={'timestamp': timezone.now()}
                )
            ConversationMember.objects.filter(conversation=conv, user=user).update(unread_count=0)

        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, conv_id=None):
        user = request.user
        cid = conv_id or request.data.get('conversation_id')
        if not cid:
            return Response({'detail': 'conversation_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        conv = Conversation.objects.filter(id=cid, members__user=user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SendMessageSerializer(data=request.data)
        if serializer.is_valid():
            reply_to = None
            if serializer.validated_data.get('reply_to_id'):
                reply_to = Message.objects.filter(id=serializer.validated_data['reply_to_id']).first()

            forward_from = None
            if serializer.validated_data.get('forward_from_id'):
                forward_from = Message.objects.filter(id=serializer.validated_data['forward_from_id']).first()

            msg = Message.objects.create(
                conversation=conv,
                sender=user,
                content=serializer.validated_data.get('content', ''),
                message_type=serializer.validated_data.get('message_type', 'text'),
                reply_to=reply_to,
                forward_from=forward_from,
                metadata=serializer.validated_data.get('metadata', {})
            )

            # Handle file attachments if sent via multipart/form-data
            uploaded_files = request.FILES.getlist('files')
            if 'attachment' in request.FILES:
                uploaded_files.append(request.FILES['attachment'])
            if 'file' in request.FILES:
                uploaded_files.append(request.FILES['file'])

            for file_obj in uploaded_files:
                media_type = request.data.get('media_type', 'other')
                if hasattr(file_obj, 'content_type'):
                    ct = file_obj.content_type.lower()
                    if 'image' in ct:
                        media_type = 'image'
                    elif 'video' in ct:
                        media_type = 'video'
                    elif 'audio' in ct:
                        media_type = 'audio'
                    elif 'pdf' in ct or 'document' in ct or 'word' in ct:
                        media_type = 'document'
                Attachment.objects.create(
                    message=msg,
                    file=file_obj,
                    file_name=file_obj.name,
                    file_size=file_obj.size,
                    file_type=getattr(file_obj, 'content_type', 'application/octet-stream'),
                    media_type=media_type,
                )

            # Disappearing messages calculation
            if conv.disappearing_messages_duration > 0:
                msg.disappears_at = timezone.now() + timezone.timedelta(seconds=conv.disappearing_messages_duration)
                msg.save(update_fields=['disappears_at'])

            # Update conversation timestamp & increment unread for other members
            conv.save(update_fields=['updated_at'])
            ConversationMember.objects.filter(conversation=conv).exclude(user=user).update(unread_count=F('unread_count') + 1)

            # Broadcast via Channels layer
            try:
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"chat_{conv.id}",
                        {
                            'type': 'broadcast_message_event',
                            'message': MessageSerializer(msg, context={'request': request}).data
                        }
                    )
            except Exception as e:
                print(f"Channel broadcast failed: {e}")

            return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MessageDetailAPIView(APIView):
    """Edit message or delete (for me or everyone)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, message_id):
        msg = Message.objects.filter(id=message_id, sender=request.user).first()
        if not msg:
            return Response({'detail': 'Message not found or not editable.'}, status=status.HTTP_404_NOT_FOUND)

        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response({'detail': 'Content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        msg.content = new_content
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=['content', 'is_edited', 'edited_at'])

        # Broadcast edit
        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{msg.conversation_id}",
                    {
                        'type': 'message_edited_event',
                        'message_id': str(msg.id),
                        'content': new_content,
                        'edited_at': msg.edited_at.isoformat()
                    }
                )
        except Exception:
            pass

        return Response(MessageSerializer(msg, context={'request': request}).data)

    def delete(self, request, message_id):
        msg = Message.objects.filter(id=message_id).first()
        if not msg:
            return Response({'detail': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        for_everyone = request.data.get('for_everyone', False) or request.query_params.get('for_everyone') == 'true'

        if for_everyone and msg.sender == request.user:
            msg.is_deleted_for_everyone = True
            msg.content = "This message was deleted"
            msg.save(update_fields=['is_deleted_for_everyone', 'content'])
        else:
            msg.deleted_for_users.add(request.user)

        # Broadcast delete
        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{msg.conversation_id}",
                    {
                        'type': 'message_deleted_event',
                        'message_id': str(msg.id),
                        'for_everyone': for_everyone,
                        'user_id': str(request.user.id),
                    }
                )
        except Exception:
            pass

        return Response({'message': 'Message deleted successfully.'})


class MessageDeleteForEveryoneAPIView(APIView):
    """Delete a message for everyone in the conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        msg = Message.objects.filter(id=message_id, sender=request.user).first()
        if not msg:
            return Response({'detail': 'Message not found or not authorized.'}, status=status.HTTP_404_NOT_FOUND)

        msg.is_deleted_for_everyone = True
        msg.content = "This message was deleted"
        msg.save(update_fields=['is_deleted_for_everyone', 'content'])

        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{msg.conversation_id}",
                    {
                        'type': 'message_deleted_event',
                        'message_id': str(msg.id),
                        'for_everyone': True,
                        'user_id': str(request.user.id),
                    }
                )
        except Exception:
            pass

        return Response({'message': 'Message deleted for everyone.', 'is_deleted_for_everyone': True})


class MessageReactionAPIView(APIView):
    """Add or remove emoji reaction."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        emoji = request.data.get('emoji', '').strip()
        if not emoji:
            return Response({'detail': 'emoji is required.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.filter(id=message_id).first()
        if not msg:
            return Response({'detail': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        reaction, created = MessageReaction.objects.get_or_create(
            message=msg, user=request.user, emoji=emoji
        )
        reactions = MessageReaction.objects.filter(message=msg).select_related('user', 'user__profile')
        return Response({
            'status': 'added' if created else 'already_exists',
            'reactions': MessageReactionSerializer(reactions, many=True, context={'request': request}).data
        })

    def delete(self, request, message_id):
        emoji = request.data.get('emoji', '').strip()
        MessageReaction.objects.filter(message_id=message_id, user=request.user, emoji=emoji).delete()
        reactions = MessageReaction.objects.filter(message_id=message_id).select_related('user', 'user__profile')
        return Response({
            'status': 'removed',
            'reactions': MessageReactionSerializer(reactions, many=True, context={'request': request}).data
        })


class MessageStarToggleAPIView(APIView):
    """Toggle starred status for a message."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        msg = Message.objects.filter(id=message_id).first()
        if not msg:
            return Response({'detail': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        if msg.is_starred_by.filter(id=request.user.id).exists():
            msg.is_starred_by.remove(request.user)
            is_starred = False
        else:
            msg.is_starred_by.add(request.user)
            is_starred = True

        return Response({'is_starred': is_starred})


class StarredMessagesListAPIView(APIView):
    """List all starred messages for the user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        starred = Message.objects.filter(
            is_starred_by=request.user,
            is_deleted_for_everyone=False
        ).select_related('sender', 'conversation').order_by('-created_at')
        return Response(MessageSerializer(starred, many=True, context={'request': request}).data)


class MessagePinToggleAPIView(APIView):
    """Pin or unpin a message in a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        msg = Message.objects.filter(id=message_id).first()
        if not msg:
            return Response({'detail': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        msg.is_pinned = not msg.is_pinned
        msg.pinned_at = timezone.now() if msg.is_pinned else None
        msg.save(update_fields=['is_pinned', 'pinned_at'])
        return Response({'is_pinned': msg.is_pinned})


class MessageForwardAPIView(APIView):
    """Forward a message to target conversations."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        original = Message.objects.filter(id=message_id).first()
        if not original:
            return Response({'detail': 'Original message not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_conv_ids = request.data.get('conversation_ids', [])
        if not target_conv_ids:
            return Response({'detail': 'conversation_ids required.'}, status=status.HTTP_400_BAD_REQUEST)

        forwarded_messages = []
        for c_id in target_conv_ids:
            conv = Conversation.objects.filter(id=c_id, members__user=request.user).first()
            if conv:
                new_msg = Message.objects.create(
                    conversation=conv,
                    sender=request.user,
                    content=original.content,
                    message_type=original.message_type,
                    forward_from=original,
                    metadata=original.metadata
                )
                forwarded_messages.append(str(new_msg.id))

        return Response({'message': f'Forwarded to {len(forwarded_messages)} conversations.'})


class ScheduledMessageListCreateAPIView(APIView):
    """Queue messages for scheduled future delivery."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scheduled = ScheduledMessage.objects.filter(sender=request.user, is_sent=False)
        return Response(ScheduledMessageSerializer(scheduled, many=True).data)

    def post(self, request):
        serializer = ScheduledMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScheduledMessageDetailAPIView(APIView):
    """Cancel scheduled message."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, schedule_id):
        deleted, _ = ScheduledMessage.objects.filter(id=schedule_id, sender=request.user).delete()
        if deleted:
            return Response({'message': 'Scheduled message cancelled.'})
        return Response({'detail': 'Scheduled message not found.'}, status=status.HTTP_404_NOT_FOUND)


class MessageDraftAPIView(APIView):
    """Get, save, or clear conversation draft."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conv_id):
        draft = MessageDraft.objects.filter(conversation_id=conv_id, user=request.user).first()
        return Response({'content': draft.content if draft else ''})

    def post(self, request, conv_id):
        content = request.data.get('content', '')
        draft, _ = MessageDraft.objects.update_or_create(
            conversation_id=conv_id,
            user=request.user,
            defaults={'content': content}
        )
        return Response({'status': 'saved', 'content': draft.content})

    def delete(self, request, conv_id):
        MessageDraft.objects.filter(conversation_id=conv_id, user=request.user).delete()
        return Response({'status': 'cleared'})


class SearchMessagesAPIView(APIView):
    """Search messages within a conversation or globally."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        conv_id = request.query_params.get('conversation_id')

        if not query:
            return Response([])

        messages = Message.objects.filter(
            conversation__members__user=request.user,
            content__icontains=query,
            is_deleted_for_everyone=False
        ).exclude(deleted_for_users=request.user)

        if conv_id:
            messages = messages.filter(conversation_id=conv_id)

        messages = messages.select_related('sender', 'conversation').order_by('-created_at')[:30]
        return Response(MessageSerializer(messages, many=True, context={'request': request}).data)
