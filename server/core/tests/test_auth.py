from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User, UserProfile

class AuthenticationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth_register')
        self.login_url = reverse('auth_login')
        self.me_url = reverse('auth_me')
        self.otp_verify_url = reverse('auth_verify_otp')
        
        self.valid_payload = {
            'email': 'nova_user@chatnova.io',
            'username': 'nova_user',
            'phone_number': '+1234567890',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'Nova',
            'last_name': 'User',
        }

    def test_user_registration_success(self):
        response = self.client.post(self.register_url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertTrue(User.objects.filter(email='nova_user@chatnova.io').exists())
        self.assertTrue(UserProfile.objects.filter(user__email='nova_user@chatnova.io').exists())

    def test_user_registration_password_mismatch(self):
        payload = self.valid_payload.copy()
        payload['password_confirm'] = 'DifferentPassword123!'
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success(self):
        # Register first
        self.client.post(self.register_url, self.valid_payload, format='json')
        
        # Login with email
        login_payload = {
            'identifier': 'nova_user@chatnova.io',
            'password': 'StrongPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])

    def test_user_login_with_phone(self):
        self.client.post(self.register_url, self.valid_payload, format='json')
        
        # Login with phone number
        login_payload = {
            'identifier': '+1234567890',
            'password': 'StrongPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_login_invalid_credentials(self):
        login_payload = {
            'identifier': 'nonexistent@chatnova.io',
            'password': 'WrongPassword123!',
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authenticated_me_endpoint(self):
        reg_res = self.client.post(self.register_url, self.valid_payload, format='json')
        token = reg_res.data['tokens']['access']
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'nova_user@chatnova.io')
