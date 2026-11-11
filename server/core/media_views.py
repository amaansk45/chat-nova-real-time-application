import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.http import FileResponse, Http404
from django.core.exceptions import ValidationError
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Conversation, Message, Attachment, User
from .chat_serializers import MessageSerializer, AttachmentSerializer
from .media_services import (
    validate_and_classify_file, generate_image_thumbnail,
    generate_voice_waveform_data, extract_urls_from_text
)

channel_layer = get_channel_layer()

class FileUploadAPIView(APIView):
    """Upload media/document attachment and attach to conversation message."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        user = request.user
        conv = Conversation.objects.filter(id=conv_id, members__user=user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if 'file' not in request.FILES:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        file_obj = request.FILES['file']
        caption = request.data.get('caption', '').strip()
        custom_media_type = request.data.get('media_type')

        try:
            detected_type = validate_and_classify_file(file_obj)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        media_type = custom_media_type if custom_media_type in ['voice', 'video', 'image', 'document', 'audio'] else detected_type

        # Create message entity
        msg = Message.objects.create(
            conversation=conv,
            sender=user,
            content=caption,
            message_type=media_type,
            metadata={
                'file_name': file_obj.name,
                'file_size': file_obj.size,
                'media_type': media_type,
            }
        )

        thumbnail_file = None
        if media_type == 'image':
            thumbnail_file = generate_image_thumbnail(file_obj)

        waveform = []
        if media_type in ['voice', 'audio']:
            waveform = generate_voice_waveform_data(duration_seconds=float(request.data.get('duration', 10)))

        attachment = Attachment.objects.create(
            message=msg,
            file=file_obj,
            file_name=file_obj.name,
            file_size=file_obj.size,
            file_type=file_obj.content_type if hasattr(file_obj, 'content_type') else 'application/octet-stream',
            media_type=media_type,
            thumbnail=thumbnail_file,
            duration=float(request.data.get('duration', 0)) if request.data.get('duration') else None,
            waveform_data=waveform,
        )

        conv.save(update_fields=['updated_at'])

        # Real-time WebSocket dispatch
        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conv.id}",
                    {
                        'type': 'broadcast_message_event',
                        'message': MessageSerializer(msg, context={'request': request}).data
                    }
                )
        except Exception:
            pass

        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class MediaGalleryAPIView(APIView):
    """Retrieve shared media, documents, audio, and links for a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        category = request.query_params.get('category', 'media') # 'media', 'documents', 'audio', 'links'

        if category == 'media':
            attachments = Attachment.objects.filter(
                message__conversation=conv,
                media_type__in=['image', 'video']
            ).order_by('-created_at')[:50]
            return Response(AttachmentSerializer(attachments, many=True).data)

        elif category == 'documents':
            attachments = Attachment.objects.filter(
                message__conversation=conv,
                media_type='document'
            ).order_by('-created_at')[:50]
            return Response(AttachmentSerializer(attachments, many=True).data)

        elif category == 'audio':
            attachments = Attachment.objects.filter(
                message__conversation=conv,
                media_type__in=['audio', 'voice']
            ).order_by('-created_at')[:50]
            return Response(AttachmentSerializer(attachments, many=True).data)

        elif category == 'links':
            messages = conv.messages.filter(content__icontains='http').order_by('-created_at')[:100]
            links = []
            for m in messages:
                extracted = extract_urls_from_text(m.content)
                for url in extracted:
                    links.append({
                        'url': url,
                        'message_id': str(m.id),
                        'sender_username': m.sender.username if m.sender else 'System',
                        'created_at': m.created_at,
                    })
            return Response(links[:50])

        return Response({'detail': "Invalid category. Choose 'media', 'documents', 'audio', or 'links'."}, status=status.HTTP_400_BAD_REQUEST)


class ShareLocationAPIView(APIView):
    """Share geographic location coordinate pin in conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        title = request.data.get('title', 'Shared Location')
        address = request.data.get('address', '')

        if lat is None or lng is None:
            return Response({'detail': 'latitude and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=f"📍 {title} ({lat}, {lng})",
            message_type='location',
            metadata={
                'latitude': float(lat),
                'longitude': float(lng),
                'title': title,
                'address': address,
            }
        )

        conv.save(update_fields=['updated_at'])

        # Real-time WebSocket dispatch
        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conv.id}",
                    {
                        'type': 'broadcast_message_event',
                        'message': MessageSerializer(msg, context={'request': request}).data
                    }
                )
        except Exception:
            pass

        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class ShareContactAPIView(APIView):
    """Share a user contact card in a conversation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_user_id = request.data.get('contact_id')
        target_name = request.data.get('name', '')
        target_phone = request.data.get('phone', '')

        if target_user_id:
            target_user = User.objects.filter(id=target_user_id).first()
            if target_user:
                target_name = target_user.get_full_name() or target_user.username
                target_phone = target_user.phone_number or ''

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=f"👤 Contact Card: {target_name}",
            message_type='contact',
            metadata={
                'name': target_name,
                'phone': target_phone,
                'user_id': str(target_user_id) if target_user_id else None,
            }
        )

        conv.save(update_fields=['updated_at'])

        # Real-time WebSocket dispatch
        try:
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{conv.id}",
                    {
                        'type': 'broadcast_message_event',
                        'message': MessageSerializer(msg, context={'request': request}).data
                    }
                )
        except Exception:
            pass

        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


class FileDownloadAPIView(APIView):
    """Secure authorized file download endpoint."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attachment_id):
        attachment = Attachment.objects.filter(
            id=attachment_id,
            message__conversation__members__user=request.user
        ).first()

        if not attachment or not attachment.file:
            raise Http404("File not found or access denied.")

        response = FileResponse(attachment.file.open('rb'), content_type=attachment.file_type)
        response['Content-Disposition'] = f'attachment; filename="{attachment.file_name}"'
        return response
