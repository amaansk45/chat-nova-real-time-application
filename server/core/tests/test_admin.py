from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile, Report

class AdminFeaturesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@chatnova.io', username='admin', password='AdminPassword123!'
        )
        UserProfile.objects.create(user=self.admin)
        self.regular_user = User.objects.create_user(
            email='regular@chatnova.io', username='regular', password='Password123!'
        )
        UserProfile.objects.create(user=self.regular_user)
        self.client.force_authenticate(user=self.admin)

    def test_admin_overview_stats(self):
        res = self.client.get(reverse('admin_overview'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', res.data)
        self.assertIn('total_messages', res.data)
        self.assertTrue(res.data['total_users'] >= 2)

    def test_admin_user_suspend_action(self):
        action_url = reverse('admin_user_action', kwargs={'user_id': self.regular_user.id})
        res = self.client.post(action_url, {'action': 'suspend'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_active)

    def test_admin_server_health(self):
        res = self.client.get(reverse('admin_server_health'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['database']['status'], 'connected')

    def test_admin_reports_resolution(self):
        report = Report.objects.create(
            reporter=self.admin,
            reported_user=self.regular_user,
            reason='spam',
            description='Test report'
        )
        res = self.client.post(reverse('admin_report_resolve', kwargs={'report_id': report.id}), {
            'status': 'resolved',
            'admin_notes': 'Spam confirmed and handled.'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.status, 'resolved')
