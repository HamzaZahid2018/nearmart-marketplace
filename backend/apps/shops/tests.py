from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.shops.models import Shop

User = get_user_model()


class ShopAPITests(APITestCase):
    """
    Unit tests for the Shop list and creation APIs.
    """
    def setUp(self):
        self.merchant = User.objects.create_user(
            username='merchant_bob',
            password='Password123!',
            role='merchant'
        )
        self.customer = User.objects.create_user(
            username='customer_joe',
            password='Password123!',
            role='customer'
        )
        self.shop_list_url = reverse('shops:shop-list')

        # Create an approved and an unapproved shop
        self.approved_shop = Shop.objects.create(
            owner=self.merchant,
            name='Approved Groceries',
            category='Grocery',
            approved=True
        )
        self.pending_shop = Shop.objects.create(
            owner=self.merchant,
            name='Pending Pharmacy',
            category='Pharmacy',
            approved=False
        )

    def test_anonymous_and_customer_can_only_see_approved_shops(self):
        # Anonymous user
        response = self.client.get(self.shop_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return 1 item (Approved Groceries)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Approved Groceries')

        # Customer user
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.shop_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_merchant_can_see_their_own_pending_shops(self):
        self.client.force_authenticate(user=self.merchant)
        response = self.client.get(self.shop_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Merchant should see both approved and pending
        self.assertEqual(len(response.data['results']), 2)

    def test_merchant_can_create_shop_but_cannot_force_approval(self):
        self.client.force_authenticate(user=self.merchant)
        data = {
            'name': 'Bob Bakery',
            'category': 'Breads',
            'approved': True,  # Attemping to self-approve
            'verified': True,
            'revenue': 5000.00
        }
        response = self.client.post(self.shop_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify shop is created but NOT approved, NOT verified, and revenue is 0.00
        shop = Shop.objects.get(id=response.data['id'])
        self.assertFalse(shop.approved)
        self.assertFalse(shop.verified)
        self.assertEqual(float(shop.revenue), 0.00)
