from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Conversation, ConversationMember, BlockedUser, Report, MessageEncryptionKey

class SecurityPrivacyTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(email='sec1@chatnova.io', username='sec1', password='Password123!')
        UserProfile.objects.create(user=self.user1)
        self.user2 = User.objects.create_user(email='sec2@chatnova.io', username='sec2', password='Password123!')
        UserProfile.objects.create(user=self.user2)
        self.client.force_authenticate(user=self.user1)

    def test_e2ee_key_registration_and_bundle(self):
        reg_url = reverse('security_register_keys')
        res = self.client.post(reg_url, {
            'device_id': 'device_web_browser_01',
            'public_identity_key': '04a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
            'public_pre_key': '04112233445566778899aabbccddeeff00112233',
            'signed_pre_key': '0499887766554433221100ffeeddccbbaa998877',
            'signature': 'test_crypto_signature_hex'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Retrieve bundle
        bundle_url = reverse('security_user_key_bundle', kwargs={'user_id': self.user1.id})
        bundle_res = self.client.get(bundle_url)
        self.assertEqual(bundle_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bundle_res.data['devices']), 1)

    def test_block_and_unblock_user(self):
        block_url = reverse('security_blocked_list')
        res = self.client.post(block_url, {
            'user_id': str(self.user2.id),
            'reason': 'Unsolicited spam messages'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(BlockedUser.objects.filter(blocker=self.user1, blocked=self.user2).exists())

        # Unblock
        unblock_url = reverse('security_unblock_user', kwargs={'user_id': self.user2.id})
        unblock_res = self.client.delete(unblock_url)
        self.assertEqual(unblock_res.status_code, status.HTTP_200_OK)
        self.assertFalse(BlockedUser.objects.filter(blocker=self.user1, blocked=self.user2).exists())

    def test_submit_report(self):
        report_url = reverse('security_submit_report')
        res = self.client.post(report_url, {
            'reported_user_id': str(self.user2.id),
            'reason': 'harassment',
            'description': 'Persistent unwanted contact'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 1)
