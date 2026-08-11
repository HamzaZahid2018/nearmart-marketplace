from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.products.models import Category, Product
from apps.interactions.models import Review, Wishlist, Notification

User = get_user_model()


class InteractionAPITests(APITestCase):
    """
    Unit tests for User Reviews, dynamic aggregate metrics recalculation, and Wishlists.
    """
    def setUp(self):
        self.user = User.objects.create_user(username='reviewer', password='password')
        self.merchant = User.objects.create_user(username='merchant', password='password', role='merchant')
        
        self.shop = Shop.objects.create(owner=self.merchant, name='Shop A', category='G', approved=True, rating=5.0, review_count=0)
        self.category = Category.objects.create(name='Fruits')
        self.product = Product.objects.create(shop=self.shop, category=self.category, name='Apple', price=1.50, rating=5.0, review_count=0)

        self.review_list_url = reverse('interactions:review-list')
        self.wishlist_list_url = reverse('interactions:wishlist-list')
        self.notification_list_url = reverse('interactions:notification-list')

        self.client.force_authenticate(user=self.user)

    def test_review_creation_recalculates_ratings(self):
        # 1. Create a 3★ review on product
        data = {
            'product': self.product.id,
            'rating': 3,
            'comment': 'Good, but average'
        }
        response = self.client.post(self.review_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 2. Verify Product and Shop ratings updated
        self.product.refresh_from_db()
        self.assertEqual(float(self.product.rating), 3.00)
        self.assertEqual(self.product.review_count, 1)

        self.shop.refresh_from_db()
        self.assertEqual(float(self.shop.rating), 3.00)
        self.assertEqual(self.shop.review_count, 1)

        # 3. Add another 5★ review from another user
        other_user = User.objects.create_user(username='reviewer2', password='password')
        self.client.force_authenticate(user=other_user)
        
        data2 = {
            'product': self.product.id,
            'rating': 5,
            'comment': 'Superb apples!'
        }
        response2 = self.client.post(self.review_list_url, data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)

        # 4. Rating average should be (3 + 5)/2 = 4★
        self.product.refresh_from_db()
        self.assertEqual(float(self.product.rating), 4.00)
        self.assertEqual(self.product.review_count, 2)

        self.shop.refresh_from_db()
        self.assertEqual(float(self.shop.rating), 4.00)
        self.assertEqual(self.shop.review_count, 2)

    def test_wishlist_prevent_duplicate_bookmarks(self):
        # Add product to wishlist
        response = self.client.post(self.wishlist_list_url, {'product': self.product.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Add duplicate product to wishlist -> fails validation
        response2 = self.client.post(self.wishlist_list_url, {'product': self.product.id}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already in your wishlist", response2.data[0])

    def test_notification_mark_all_read(self):
        # Create notifications
        Notification.objects.create(user=self.user, title='N1', message='M1', is_read=False)
        Notification.objects.create(user=self.user, title='N2', message='M2', is_read=False)

        mark_all_url = reverse('interactions:notification-mark-all-read')
        response = self.client.post(mark_all_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify notifications marked as read
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=True).count(), 2)
