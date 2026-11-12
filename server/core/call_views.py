import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.db.models import Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Call, CallParticipant, User, Conversation, Notification
from .call_serializers import (
    CallSerializer, InitiateCallSerializer, CallActionSerializer
)
from .social_serializers import ContactUserSerializer

channel_layer = get_channel_layer()

class InitiateCallAPIView(APIView):
    """Initiate a 1-on-1 audio/video call or group call."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InitiateCallSerializer(data=request.data)
        if serializer.is_valid():
            recipient_id = serializer.validated_data.get('recipient_id')
            conv_id = serializer.validated_data.get('conversation_id')
            call_type = serializer.validated_data['call_type']

            target_user = None
            if recipient_id:
                target_user = User.objects.filter(id=recipient_id).first()
                if not target_user:
                    return Response({'detail': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
                if target_user.id == request.user.id:
                    return Response({'detail': 'Cannot call yourself.'}, status=status.HTTP_400_BAD_REQUEST)

            conv = None
            if conv_id:
                conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
                if not target_user and conv:
                    other_member = conv.members.exclude(user=request.user).first()
                    if other_member:
                        target_user = other_member.user

            room_id = f"room_{uuid.uuid4().hex[:12]}"
            call_obj = Call.objects.create(
                caller=request.user,
                conversation=conv,
                call_type=call_type,
                status='ringing',
                room_id=room_id,
            )

            # Record caller participant
            CallParticipant.objects.create(
                call=call_obj,
                user=request.user,
                role='caller',
                status='joined',
                joined_at=timezone.now()
            )

            # Record receiver participant
            if target_user:
                CallParticipant.objects.create(
                    call=call_obj,
                    user=target_user,
                    role='receiver',
                    status='invited'
                )

                # Send real-time incoming call alert to recipient
                try:
                    if channel_layer:
                        call_notification = {
                            'type': 'incoming_call',
                            'action': 'incoming_call',
                            'call_id': str(call_obj.id),
                            'room_id': room_id,
                            'call_type': call_type,
                            'caller': ContactUserSerializer(request.user).data,
                            'conversation_id': str(conv.id) if conv else None,
                        }
                        async_to_sync(channel_layer.group_send)(
                            f"user_{target_user.id}",
                            {
                                'type': 'send_notification_event',
                                'notification': call_notification,
                            }
                        )
                        if conv:
                            async_to_sync(channel_layer.group_send)(
                                f"chat_{conv.id}",
                                {
                                    'type': 'call_incoming_event',
                                    'call_id': str(call_obj.id),
                                    'room_id': room_id,
                                    'call_type': call_type,
                                    'caller': ContactUserSerializer(request.user).data,
                                    'conversation_id': str(conv.id),
                                }
                            )
                except Exception as e:
                    print(f"Call notification dispatch failed: {e}")

            return Response(CallSerializer(call_obj, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CallActionAPIView(APIView):
    """Update call state: accept, reject, end, or miss."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, call_id):
        call_obj = Call.objects.filter(id=call_id).first()
        if not call_obj:
            return Response({'detail': 'Call session not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CallActionSerializer(data=request.data)
        if serializer.is_valid():
            action = serializer.validated_data['action']
            duration = serializer.validated_data.get('duration_seconds', 0)

            participant = CallParticipant.objects.filter(call=call_obj, user=request.user).first()

            if action == 'accept':
                call_obj.status = 'active'
                call_obj.save(update_fields=['status'])
                if participant:
                    participant.status = 'joined'
                    participant.joined_at = timezone.now()
                    participant.save(update_fields=['status', 'joined_at'])

            elif action == 'reject':
                call_obj.status = 'rejected'
                call_obj.ended_at = timezone.now()
                call_obj.save(update_fields=['status', 'ended_at'])
                if participant:
                    participant.status = 'declined'
                    participant.left_at = timezone.now()
                    participant.save(update_fields=['status', 'left_at'])

            elif action == 'end':
                call_obj.status = 'ended'
                call_obj.ended_at = timezone.now()
                call_obj.duration_seconds = max(call_obj.duration_seconds, duration)
                call_obj.save(update_fields=['status', 'ended_at', 'duration_seconds'])
                if participant:
                    participant.status = 'left'
                    participant.left_at = timezone.now()
                    participant.save(update_fields=['status', 'left_at'])

            elif action == 'miss':
                call_obj.status = 'missed'
                call_obj.ended_at = timezone.now()
                call_obj.save(update_fields=['status', 'ended_at'])

            # Broadcast call status update to room and conversation
            try:
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"call_{call_obj.room_id}",
                        {
                            'type': 'signaling_relay_event',
                            'sender_id': str(request.user.id),
                            'sender_username': request.user.username,
                            'signal_type': f"call_{action}",
                            'payload': {'call_id': str(call_obj.id), 'status': call_obj.status}
                        }
                    )
                    if call_obj.conversation:
                        async_to_sync(channel_layer.group_send)(
                            f"chat_{call_obj.conversation_id}",
                            {
                                'type': 'call_status_event',
                                'call_id': str(call_obj.id),
                                'room_id': call_obj.room_id,
                                'status': call_obj.status,
                                'action': action,
                            }
                        )
            except Exception:
                pass

            return Response(CallSerializer(call_obj, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CallHistoryAPIView(APIView):
    """Retrieve call history logs for the user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        filter_type = request.query_params.get('filter', 'all') # 'all', 'missed', 'incoming', 'outgoing'

        calls = Call.objects.filter(
            Q(caller=user) | Q(participants__user=user)
        ).distinct().select_related('caller', 'caller__profile').prefetch_related(
            'participants', 'participants__user'
        ).order_by('-started_at')

        if filter_type == 'missed':
            calls = calls.filter(status='missed')
        elif filter_type == 'incoming':
            calls = calls.exclude(caller=user)
        elif filter_type == 'outgoing':
            calls = calls.filter(caller=user)

        serializer = CallSerializer(calls[:50], many=True, context={'request': request})
        return Response(serializer.data)


class CallICEConfigAPIView(APIView):
    """Return STUN / TURN server configuration for WebRTC client connection."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        ice_servers = [
            {'urls': 'stun:stun.l.google.com:19302'},
            {'urls': 'stun:stun1.l.google.com:19302'},
            {'urls': 'stun:stun2.l.google.com:19302'},
            {'urls': 'stun:stun3.l.google.com:19302'},
            {'urls': 'stun:stun4.l.google.com:19302'},
        ]
        return Response({'iceServers': ice_servers})
