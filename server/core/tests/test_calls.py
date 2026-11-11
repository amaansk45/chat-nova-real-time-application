from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Call

class CallFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.caller = User.objects.create_user(email='caller@chatnova.io', username='caller', password='Password123!')
        UserProfile.objects.create(user=self.caller)
        self.receiver = User.objects.create_user(email='receiver@chatnova.io', username='receiver', password='Password123!')
        UserProfile.objects.create(user=self.receiver)
        self.client.force_authenticate(user=self.caller)

    def test_initiate_and_end_call(self):
        # Initiate call
        init_res = self.client.post(reverse('call_initiate'), {
            'recipient_id': str(self.receiver.id),
            'call_type': 'video'
        }, format='json')
        self.assertEqual(init_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(init_res.data['call_type'], 'video')
        self.assertEqual(init_res.data['status'], 'ringing')
        call_id = init_res.data['id']

        # Receiver accepts
        self.client.force_authenticate(user=self.receiver)
        action_url = reverse('call_action', kwargs={'call_id': call_id})
        accept_res = self.client.post(action_url, {'action': 'accept'}, format='json')
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_res.data['status'], 'active')

        # Caller ends call
        self.client.force_authenticate(user=self.caller)
        end_res = self.client.post(action_url, {'action': 'end', 'duration_seconds': 45}, format='json')
        self.assertEqual(end_res.status_code, status.HTTP_200_OK)
        self.assertEqual(end_res.data['status'], 'ended')
        self.assertEqual(end_res.data['duration_seconds'], 45)

        # Verify call history
        history_res = self.client.get(reverse('call_history'))
        self.assertEqual(history_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_res.data), 1)

    def test_ice_config_endpoint(self):
        res = self.client.get(reverse('call_ice_config'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('iceServers', res.data)
