from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Contact, PersonalNote

class SocialFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email='alice@chatnova.io', username='alice', password='Password123!'
        )
        UserProfile.objects.create(user=self.user1, bio='Alice in ChatNova')
        
        self.user2 = User.objects.create_user(
            email='bob@chatnova.io', username='bob', password='Password123!'
        )
        UserProfile.objects.create(user=self.user2, bio='Bob developer')
        
        self.client.force_authenticate(user=self.user1)

    def test_get_own_profile(self):
        response = self.client.get(reverse('user_profile_me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')
        self.assertEqual(response.data['bio'], 'Alice in ChatNova')

    def test_update_own_profile(self):
        response = self.client.patch(reverse('user_profile_me'), {
            'bio': 'Updated bio by Alice',
            'status_message': 'Busy coding'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['bio'], 'Updated bio by Alice')
        self.assertEqual(response.data['status_message'], 'Busy coding')

    def test_user_search(self):
        response = self.client.get(reverse('users_search'), {'q': 'bob'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'bob')

    def test_add_and_list_contact(self):
        # Add Bob as contact
        response = self.client.post(reverse('contacts_list_create'), {
            'identifier': 'bob@chatnova.io',
            'nickname': 'Bobby'
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        
        # Verify contact list
        list_res = self.client.get(reverse('contacts_list_create'))
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['nickname'], 'Bobby')

    def test_personal_notes_crud(self):
        # Create note
        create_res = self.client.post(reverse('personal_notes_list_create'), {
            'title': 'My Secret Note',
            'content': 'Antigravity + ChatNova = Future',
            'color': '#2563EB',
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        note_id = create_res.data['id']
        
        # Retrieve list
        list_res = self.client.get(reverse('personal_notes_list_create'))
        self.assertEqual(len(list_res.data), 1)
        
        # Delete note
        del_res = self.client.delete(reverse('personal_note_detail', kwargs={'note_id': note_id}))
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertEqual(PersonalNote.objects.count(), 0)

    def test_presence_heartbeat(self):
        response = self.client.post(reverse('presence_heartbeat'), {'is_online': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.is_online)

