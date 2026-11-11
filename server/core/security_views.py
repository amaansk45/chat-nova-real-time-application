from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from .models import (
    User, Conversation, ConversationMember, Message,
    MessageEncryptionKey, BlockedUser, Report
)
from .security_serializers import (
    MessageEncryptionKeySerializer, BlockedUserSerializer,
    BlockUserActionSerializer, ReportSerializer, SubmitReportSerializer,
    DisappearingMessagesConfigSerializer
)

class RegisterEncryptionKeysAPIView(APIView):
    """Register or update device public keys for End-to-End Encryption."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MessageEncryptionKeySerializer(data=request.data)
        if serializer.is_valid():
            device_id = serializer.validated_data['device_id']
            key_obj, created = MessageEncryptionKey.objects.update_or_create(
                user=request.user,
                device_id=device_id,
                defaults={
                    'public_identity_key': serializer.validated_data['public_identity_key'],
                    'public_pre_key': serializer.validated_data['public_pre_key'],
                    'signed_pre_key': serializer.validated_data['signed_pre_key'],
                    'signature': serializer.validated_data.get('signature', ''),
                }
            )
            return Response(MessageEncryptionKeySerializer(key_obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserKeyBundleAPIView(APIView):
    """Retrieve active cryptographic public key bundles for a user's devices."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        keys = MessageEncryptionKey.objects.filter(user=target_user)
        return Response({
            'user_id': str(target_user.id),
            'username': target_user.username,
            'devices': MessageEncryptionKeySerializer(keys, many=True).data
        })


class BlockedUsersListAPIView(APIView):
    """List blocked accounts or block a user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        blocked = BlockedUser.objects.filter(blocker=request.user).select_related('blocked', 'blocked__profile')
        return Response(BlockedUserSerializer(blocked, many=True).data)

    def post(self, request):
        serializer = BlockUserActionSerializer(data=request.data)
        if serializer.is_valid():
            target_id = serializer.validated_data['user_id']
            reason = serializer.validated_data.get('reason', '')

            if str(target_id) == str(request.user.id):
                return Response({'detail': 'You cannot block yourself.'}, status=status.HTTP_400_BAD_REQUEST)

            target_user = User.objects.filter(id=target_id).first()
            if not target_user:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

            blocked_entry, created = BlockedUser.objects.get_or_create(
                blocker=request.user,
                blocked=target_user,
                defaults={'reason': reason}
            )
            return Response(BlockedUserSerializer(blocked_entry).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UnblockUserAPIView(APIView):
    """Unblock a previously blocked account."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        deleted, _ = BlockedUser.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        if deleted:
            return Response({'message': 'User unblocked successfully.'})
        return Response({'detail': 'Blocked entry not found.'}, status=status.HTTP_404_NOT_FOUND)


class SubmitReportAPIView(APIView):
    """File a report against inappropriate content, user harassment, or scam."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SubmitReportSerializer(data=request.data)
        if serializer.is_valid():
            report = Report.objects.create(
                reporter=request.user,
                reported_user_id=serializer.validated_data.get('reported_user_id'),
                reported_message_id=serializer.validated_data.get('reported_message_id'),
                reported_conversation_id=serializer.validated_data.get('reported_conversation_id'),
                reason=serializer.validated_data['reason'],
                description=serializer.validated_data.get('description', ''),
                status='pending'
            )
            return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DisappearingMessagesConfigAPIView(APIView):
    """Configure disappearing messages duration for a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = DisappearingMessagesConfigSerializer(data=request.data)
        if serializer.is_valid():
            duration = serializer.validated_data['duration_seconds']
            conv.disappearing_messages_duration = duration
            conv.save(update_fields=['disappearing_messages_duration'])

            duration_text = "off"
            if duration == 86400:
                duration_text = "24 hours"
            elif duration == 604800:
                duration_text = "7 days"
            elif duration == 7776000:
                duration_text = "90 days"

            # Post system alert
            Message.objects.create(
                conversation=conv,
                sender=None,
                message_type='system',
                content=f"{request.user.username} set disappearing messages to {duration_text}."
            )

            return Response({'disappearing_messages_duration': duration, 'status': 'updated'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PurgeExpiredDisappearingMessagesAPIView(APIView):
    """Purge messages that have exceeded their disappearing timer."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        expired = Message.objects.filter(disappears_at__isnull=False, disappears_at__lte=now)
        count = expired.count()
        expired.delete()
        return Response({'purged_count': count, 'timestamp': now})
