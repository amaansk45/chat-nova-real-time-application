from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, UserStatus, Contact

class StatusFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(email='author@chatnova.io', username='author', password='Password123!')
        UserProfile.objects.create(user=self.author)
        self.viewer = User.objects.create_user(email='viewer@chatnova.io', username='viewer', password='Password123!')
        UserProfile.objects.create(user=self.viewer)
        
        # Make them contacts
        Contact.objects.create(user=self.viewer, contact=self.author)
        Contact.objects.create(user=self.author, contact=self.viewer)
        
        self.client.force_authenticate(user=self.author)

    def test_create_and_feed_status(self):
        # Create text status
        create_res = self.client.post(reverse('status_create'), {
            'media_type': 'text',
            'text_content': 'Hello from ChatNova stories!',
            'background_color': '#2563EB',
            'font_style': 'sans',
            'privacy': 'everyone',
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        status_id = create_res.data['id']

        # Viewer checks feed
        self.client.force_authenticate(user=self.viewer)
        feed_res = self.client.get(reverse('status_feed'))
        self.assertEqual(feed_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(feed_res.data) > 0)

        # Viewer records view
        view_res = self.client.post(reverse('status_record_view', kwargs={'status_id': status_id}))
        self.assertEqual(view_res.status_code, status.HTTP_200_OK)

        # Viewer reacts
        react_res = self.client.post(reverse('status_react', kwargs={'status_id': status_id}), {'emoji': '🔥'}, format='json')
        self.assertEqual(react_res.status_code, status.HTTP_200_OK)

        # Viewer replies
        reply_res = self.client.post(reverse('status_reply', kwargs={'status_id': status_id}), {'message': 'Awesome story!'}, format='json')
        self.assertEqual(reply_res.status_code, status.HTTP_201_CREATED)
        self.assertIn('Replied to story', reply_res.data['content'])
