import io
from PIL import Image
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Conversation, ConversationMember, Attachment

class MediaFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='media_user@chatnova.io', username='media_user', password='Password123!')
        UserProfile.objects.create(user=self.user)
        self.conv = Conversation.objects.create(type='direct', created_by=self.user)
        ConversationMember.objects.create(conversation=self.conv, user=self.user)
        self.client.force_authenticate(user=self.user)

    def test_image_upload_and_thumbnail(self):
        # Create a tiny 100x100 RGB image in-memory
        image_io = io.BytesIO()
        img = Image.new('RGB', (100, 100), color='blue')
        img.save(image_io, format='JPEG')
        image_io.seek(0)
        uploaded_file = SimpleUploadedFile("test_pic.jpg", image_io.read(), content_type="image/jpeg")

        upload_url = reverse('media_upload', kwargs={'conv_id': self.conv.id})
        res = self.client.post(upload_url, {
            'file': uploaded_file,
            'caption': 'Check out this photo!',
            'media_type': 'image'
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['message_type'], 'image')
        self.assertEqual(len(res.data['attachments']), 1)
        self.assertIsNotNone(res.data['attachments'][0]['thumbnail_url'])

    def test_share_location(self):
        loc_url = reverse('share_location', kwargs={'conv_id': self.conv.id})
        res = self.client.post(loc_url, {
            'latitude': 37.7749,
            'longitude': -122.4194,
            'title': 'San Francisco HQ',
            'address': 'Market Street, CA'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['message_type'], 'location')
        self.assertEqual(res.data['metadata']['latitude'], 37.7749)

    def test_share_contact(self):
        contact_url = reverse('share_contact', kwargs={'conv_id': self.conv.id})
        res = self.client.post(contact_url, {
            'name': 'Alex Designer',
            'phone': '+1987654321',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['message_type'], 'contact')
        self.assertEqual(res.data['metadata']['name'], 'Alex Designer')

    def test_media_gallery_tabs(self):
        gallery_url = reverse('media_gallery', kwargs={'conv_id': self.conv.id})
        res = self.client.get(gallery_url, {'category': 'media'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
