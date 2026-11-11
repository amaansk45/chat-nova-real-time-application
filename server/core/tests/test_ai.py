from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile

class AIFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='ai_tester@chatnova.io', username='ai_tester', password='Password123!')
        UserProfile.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)

    def test_ai_chat_assistant(self):
        res = self.client.post(reverse('ai_chat_assistant'), {
            'prompt': 'Hello Nova, what is ChatNova?'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('reply', res.data)
        self.assertIn('Nova-AI-Engine', res.data['model'])

    def test_smart_replies(self):
        res = self.client.post(reverse('ai_smart_replies'), {
            'context_messages': ['Can we jump on a quick call to review the designs?']
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['suggestions']), 3)

    def test_summarization(self):
        res = self.client.post(reverse('ai_summarize'), {
            'messages': [
                'Hey team, welcome to ChatNova development.',
                'The database models and migrations are completed.',
                'We are reviewing the WebSockets and AI services today.',
            ]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('summary', res.data)
        self.assertIn('key_points', res.data)

    def test_translation(self):
        res = self.client.post(reverse('ai_translate'), {
            'text': 'Hello, thank you for your support!',
            'target_language': 'es'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['target_language'], 'es')
        self.assertIn('translated', res.data)

    def test_writing_assistant(self):
        res = self.client.post(reverse('ai_writing_assistant'), {
            'text': 'i will finish this tomorrow maybe',
            'action': 'make_professional'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('result', res.data)
        self.assertEqual(res.data['action'], 'make_professional')
