from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.users.models import Address

User = get_user_model()


class UserAuthTests(APITestCase):
    """
    Unit tests for registration, login, and user profiles.
    """
    def setUp(self):
        self.register_url = reverse('users:register')
        self.login_url = reverse('users:login')
        self.profile_url = reverse('users:profile')
        self.user_data = {
            'username': 'buyer_joe',
            'email': 'joe@nearmart.com',
            'password': 'StrongPassword123!',
            'first_name': 'Joe',
            'last_name': 'Buyer',
            'role': 'customer',
            'phone_number': '1234567890'
        }

    def test_user_registration(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['username'], 'buyer_joe')

    def test_user_login(self):
        # Register first
        self.client.post(self.register_url, self.user_data, format='json')
        
        login_data = {
            'username': 'buyer_joe',
            'password': 'StrongPassword123!'
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_get_profile(self):
        # Register and login to set token
        reg_response = self.client.post(self.register_url, self.user_data, format='json')
        token = reg_response.data['token']
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'buyer_joe')


class AddressTests(APITestCase):
    """
    Unit tests for delivery Address viewsets.
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='address_user',
            password='TestPassword123!',
            email='user@test.com'
        )
        self.client.force_authenticate(user=self.user)
        self.address_list_url = reverse('users:address-list')

    def test_create_address(self):
        data = {
            'title': 'Office',
            'street_address': '123 Tech Park',
            'city': 'Metropolis',
            'state': 'NY',
            'zip_code': '10001',
            'is_default': True
        }
        response = self.client.post(self.address_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Address.objects.filter(user=self.user).count(), 1)

    def test_default_address_toggle(self):
        # Create first address as default
        addr1 = Address.objects.create(
            user=self.user, title='Home', street_address='Addr 1', 
            city='C1', state='S1', zip_code='Z1', is_default=True
        )
        # Create second address as default via API
        data = {
            'title': 'Office',
            'street_address': 'Addr 2',
            'city': 'C2',
            'state': 'S2',
            'zip_code': 'Z2',
            'is_default': True
        }
        response = self.client.post(self.address_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify first is now false
        addr1.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertEqual(Address.objects.filter(user=self.user, is_default=True).count(), 1)

    def test_soft_delete_address(self):
        addr = Address.objects.create(
            user=self.user, title='Home', street_address='Addr 1', 
            city='C1', state='S1', zip_code='Z1'
        )
        detail_url = reverse('users:address-detail', kwargs={'pk': addr.id})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify address is soft deleted
        addr.refresh_from_db()
        self.assertTrue(addr.is_deleted)
