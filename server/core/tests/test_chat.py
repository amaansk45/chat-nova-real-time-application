from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Conversation, ConversationMember, Message

class ChatMessagingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(email='user1@chatnova.io', username='user1', password='Password123!')
        UserProfile.objects.create(user=self.user1)
        self.user2 = User.objects.create_user(email='user2@chatnova.io', username='user2', password='Password123!')
        UserProfile.objects.create(user=self.user2)
        
        self.client.force_authenticate(user=self.user1)

    def test_create_and_list_conversations(self):
        # Create direct conversation with user2
        res = self.client.post(reverse('conversations_list_create'), {'recipient_id': str(self.user2.id)}, format='json')
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        conv_id = res.data['id']
        
        # Verify list
        list_res = self.client.get(reverse('conversations_list_create'))
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]['id'], conv_id)

    def test_send_and_retrieve_messages(self):
        # Setup conversation
        conv = Conversation.objects.create(type='direct', created_by=self.user1)
        ConversationMember.objects.create(conversation=conv, user=self.user1)
        ConversationMember.objects.create(conversation=conv, user=self.user2)
        
        # Send message
        send_url = reverse('messages_list_create', kwargs={'conv_id': conv.id})
        send_res = self.client.post(send_url, {'content': 'Hello from ChatNova!', 'message_type': 'text'}, format='json')
        self.assertEqual(send_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(send_res.data['content'], 'Hello from ChatNova!')
        
        # Retrieve messages
        get_res = self.client.get(send_url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_res.data), 1)

    def test_edit_and_star_message(self):
        conv = Conversation.objects.create(type='direct', created_by=self.user1)
        ConversationMember.objects.create(conversation=conv, user=self.user1)
        msg = Message.objects.create(conversation=conv, sender=self.user1, content='Original message')
        
        # Edit message
        edit_url = reverse('message_detail', kwargs={'message_id': msg.id})
        edit_res = self.client.patch(edit_url, {'content': 'Edited message'}, format='json')
        self.assertEqual(edit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_res.data['content'], 'Edited message')
        self.assertTrue(edit_res.data['is_edited'])
        
        # Star message
        star_url = reverse('message_star_toggle', kwargs={'message_id': msg.id})
        star_res = self.client.post(star_url)
        self.assertEqual(star_res.status_code, status.HTTP_200_OK)
        self.assertTrue(star_res.data['is_starred'])

    def test_message_reaction(self):
        conv = Conversation.objects.create(type='direct', created_by=self.user1)
        ConversationMember.objects.create(conversation=conv, user=self.user1)
        msg = Message.objects.create(conversation=conv, sender=self.user1, content='React to this!')
        
        reaction_url = reverse('message_reaction', kwargs={'message_id': msg.id})
        res = self.client.post(reaction_url, {'emoji': '🔥'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(msg.reactions.count(), 1)
