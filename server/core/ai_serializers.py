from rest_framework import serializers

class AIChatAssistantSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=True)
    history = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        default=list
    )


class SmartReplyRequestSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    context_messages = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class SummarizeRequestSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    messages = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class TranslationRequestSerializer(serializers.Serializer):
    text = serializers.CharField(required=True)
    target_language = serializers.CharField(required=False, default='es')


class WritingAssistantRequestSerializer(serializers.Serializer):
    text = serializers.CharField(required=True)
    action = serializers.ChoiceField(
        choices=['grammar_fix', 'make_professional', 'make_friendly', 'shorten', 'expand'],
        default='grammar_fix'
    )


class VoiceTranscriptionRequestSerializer(serializers.Serializer):
    attachment_id = serializers.UUIDField(required=False, allow_null=True)
    duration = serializers.FloatField(required=False, default=5.0)


class ConversationInsightsRequestSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField(required=True)
