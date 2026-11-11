from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Conversation, Group, GroupPoll

class GroupFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email='owner@chatnova.io', username='owner', password='Password123!')
        UserProfile.objects.create(user=self.owner)
        self.member1 = User.objects.create_user(email='member1@chatnova.io', username='member1', password='Password123!')
        UserProfile.objects.create(user=self.member1)
        self.client.force_authenticate(user=self.owner)

    def test_create_group(self):
        url = reverse('group_create')
        payload = {
            'title': 'Frontend Engineers',
            'description': 'React & TypeScript discussions',
            'member_ids': [str(self.member1.id)]
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], 'Frontend Engineers')
        self.assertEqual(len(res.data['members']), 2)

    def test_group_invite_link_and_join(self):
        # Create group
        create_res = self.client.post(reverse('group_create'), {'title': 'Designers Club'}, format='json')
        group_id = create_res.data['id']

        # Get invite link
        invite_url = reverse('group_invite_link', kwargs={'group_id': group_id})
        invite_res = self.client.get(invite_url)
        self.assertEqual(invite_res.status_code, status.HTTP_200_OK)
        token = invite_res.data['invite_token']

        # Switch to member1 and join via invite
        self.client.force_authenticate(user=self.member1)
        join_url = reverse('group_join_via_invite', kwargs={'token': token})
        join_res = self.client.post(join_url)
        self.assertEqual(join_res.status_code, status.HTTP_200_OK)
        self.assertEqual(join_res.data['group']['title'], 'Designers Club')

    def test_group_poll_create_and_vote(self):
        create_res = self.client.post(reverse('group_create'), {'title': 'Gaming Squad'}, format='json')
        group_id = create_res.data['id']

        poll_url = reverse('group_polls_list_create', kwargs={'conv_id': group_id})
        poll_res = self.client.post(poll_url, {
            'question': 'Which game tonight?',
            'options': ['Valorant', 'Apex Legends', 'Overwatch 2']
        }, format='json')
        self.assertEqual(poll_res.status_code, status.HTTP_201_CREATED)
        poll_id = poll_res.data['id']
        option_id = poll_res.data['options'][0]['id']

        # Vote
        vote_url = reverse('group_poll_vote', kwargs={'poll_id': poll_id})
        vote_res = self.client.post(vote_url, {'option_id': option_id}, format='json')
        self.assertEqual(vote_res.status_code, status.HTTP_200_OK)
        self.assertEqual(vote_res.data['action'], 'vote_cast')
