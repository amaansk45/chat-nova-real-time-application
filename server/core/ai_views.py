from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Conversation, Message, Attachment
from .ai_serializers import (
    AIChatAssistantSerializer, SmartReplyRequestSerializer,
    SummarizeRequestSerializer, TranslationRequestSerializer,
    WritingAssistantRequestSerializer, VoiceTranscriptionRequestSerializer,
    ConversationInsightsRequestSerializer
)
from .ai_services import AIServiceEngine

class AIChatAssistantAPIView(APIView):
    """Interact directly with Nova AI conversational assistant."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AIChatAssistantSerializer(data=request.data)
        if serializer.is_valid():
            prompt = serializer.validated_data['prompt']
            history = serializer.validated_data.get('history', [])
            response_data = AIServiceEngine.ask_nova_assistant(prompt, history)
            return Response(response_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AISmartRepliesAPIView(APIView):
    """Generate 3 contextual quick-reply pills based on recent messages."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SmartReplyRequestSerializer(data=request.data)
        if serializer.is_valid():
            conv_id = serializer.validated_data.get('conversation_id')
            context_messages = serializer.validated_data.get('context_messages', [])

            if conv_id and not context_messages:
                msgs = Message.objects.filter(
                    conversation_id=conv_id,
                    is_deleted_for_everyone=False
                ).order_by('-created_at')[:5]
                context_messages = [m.content for m in reversed(list(msgs)) if m.content]

            suggestions = AIServiceEngine.generate_smart_replies(context_messages)
            return Response({'suggestions': suggestions})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AISummarizeAPIView(APIView):
    """Summarize long unread conversation history into key points and action items."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SummarizeRequestSerializer(data=request.data)
        if serializer.is_valid():
            conv_id = serializer.validated_data.get('conversation_id')
            messages_list = serializer.validated_data.get('messages', [])

            if conv_id and not messages_list:
                msgs = Message.objects.filter(
                    conversation_id=conv_id,
                    is_deleted_for_everyone=False
                ).order_by('-created_at')[:30]
                messages_list = [m.content for m in reversed(list(msgs)) if m.content]

            summary_data = AIServiceEngine.summarize_conversation(messages_list)
            return Response(summary_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AITranslateAPIView(APIView):
    """Translate message text into target language."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TranslationRequestSerializer(data=request.data)
        if serializer.is_valid():
            text = serializer.validated_data['text']
            target_lang = serializer.validated_data.get('target_language', 'es')
            result = AIServiceEngine.translate_text(text, target_lang)
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AIWritingAssistantAPIView(APIView):
    """Grammar check and tone rephrasing (professional, friendly, concise, expanded)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = WritingAssistantRequestSerializer(data=request.data)
        if serializer.is_valid():
            text = serializer.validated_data['text']
            action = serializer.validated_data.get('action', 'grammar_fix')
            result = AIServiceEngine.assist_writing(text, action)
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AIVoiceTranscriptionAPIView(APIView):
    """Transcribe voice message or audio recording into text."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VoiceTranscriptionRequestSerializer(data=request.data)
        if serializer.is_valid():
            attachment_id = serializer.validated_data.get('attachment_id')
            duration = serializer.validated_data.get('duration', 5.0)

            file_name = 'voice_note.webm'
            if attachment_id:
                attachment = Attachment.objects.filter(id=attachment_id).first()
                if attachment:
                    file_name = attachment.file_name
                    if attachment.duration:
                        duration = attachment.duration

            result = AIServiceEngine.transcribe_audio_message(file_name, duration)
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AIConversationInsightsAPIView(APIView):
    """Provide sentiment analysis, engagement metrics, and discussion topics."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conv_id):
        conv = Conversation.objects.filter(id=conv_id, members__user=request.user).first()
        if not conv:
            return Response({'detail': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        msgs = conv.messages.filter(is_deleted_for_everyone=False).order_by('-created_at')[:40]
        messages_list = [m.content for m in msgs if m.content]

        insights = AIServiceEngine.generate_conversation_insights(messages_list)
        return Response(insights)
