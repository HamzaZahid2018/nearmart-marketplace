from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.promotions.models import Coupon

User = get_user_model()


class CouponAPITests(APITestCase):
    """
    Unit tests for coupon management and validation checks.
    """
    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin', password='password')
        self.user = User.objects.create_user(username='buyer', password='password')
        
        # Valid coupon
        self.coupon = Coupon.objects.create(
            code='SAVE20',
            description='20% off over $50',
            discount_percent=20,
            active=True,
            min_spend=50.00,
            max_discount_amount=30.00
        )
        
        # Expired coupon
        self.expired_coupon = Coupon.objects.create(
            code='EXPIRED',
            discount_percent=10,
            active=True,
            start_date=timezone.now() - timedelta(days=10),
            end_date=timezone.now() - timedelta(days=2)
        )

        self.validate_url = reverse('promotions:coupon-validate-code')

    def test_coupon_validation_success(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'code': 'SAVE20',
            'amount': 100.00
        }
        response = self.client.post(self.validate_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        # 20% of 100 is 20
        self.assertEqual(response.data['discount_amount'], 20.00)
        self.assertEqual(response.data['final_amount'], 80.00)

    def test_coupon_validation_max_discount_cap(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'code': 'SAVE20',
            'amount': 200.00
        }
        response = self.client.post(self.validate_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 20% of 200 is 40, but capped at max_discount_amount=30.00
        self.assertEqual(response.data['discount_amount'], 30.00)
        self.assertEqual(response.data['final_amount'], 170.00)

    def test_coupon_validation_fails_min_spend(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'code': 'SAVE20',
            'amount': 40.00  # Below 50.00 limit
        }
        response = self.client.post(self.validate_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        self.assertIn("Minimum spend", response.data['error'])

    def test_coupon_validation_fails_expired(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'code': 'EXPIRED',
            'amount': 100.00
        }
        response = self.client.post(self.validate_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        self.assertIn("expired", response.data['error'])
