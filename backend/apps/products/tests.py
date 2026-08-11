from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.products.models import Category, Product, Inventory

User = get_user_model()


class ProductAPITests(APITestCase):
    """
    Unit tests for categories and nested product listings with inventory checks.
    """
    def setUp(self):
        self.admin = User.objects.create_superuser(username='admin', password='password')
        self.merchant = User.objects.create_user(username='merchant', password='password', role='merchant')
        self.other_merchant = User.objects.create_user(username='other', password='password', role='merchant')
        
        self.shop = Shop.objects.create(owner=self.merchant, name='Bob Grocery', category='Grocery', approved=True)
        self.other_shop = Shop.objects.create(owner=self.other_merchant, name='Alice Dairy', category='Grocery', approved=True)
        
        self.category = Category.objects.create(name='Fruits')
        self.product = Product.objects.create(
            shop=self.shop,
            category=self.category,
            name='Fresh Apples',
            price=2.50
        )
        # Create inventory
        Inventory.objects.create(product=self.product, quantity=50)

        self.product_list_url = reverse('products:product-list')
        self.category_list_url = reverse('products:category-list')

    def test_public_can_read_categories_but_not_write(self):
        # Read OK
        response = self.client.get(self.category_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Write Denied for public
        response = self.client.post(self.category_list_url, {'name': 'New Cat'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_price_range_filtering(self):
        # Create another cheaper product
        cheap = Product.objects.create(shop=self.shop, category=self.category, name='Banana', price=0.50)
        Inventory.objects.create(product=cheap, quantity=10)

        # Query filter min_price=1.00
        response = self.client.get(self.product_list_url, {'min_price': 1.00})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see apples ($2.50)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Fresh Apples')

    def test_merchant_cannot_add_product_to_others_shop(self):
        self.client.force_authenticate(user=self.merchant)
        data = {
            'shop': self.other_shop.id,  # Owned by other_merchant
            'category': self.category.id,
            'name': 'Hacked Milk',
            'price': 4.00,
            'status': 'active'
        }
        response = self.client.post(self.product_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("You do not have permission to add products to this shop", response.data[0])

    def test_merchant_nested_product_and_inventory_creation(self):
        self.client.force_authenticate(user=self.merchant)
        data = {
            'shop': self.shop.id,
            'category': self.category.id,
            'name': 'Organic Berries',
            'price': 5.99,
            'status': 'active',
            'inventory': {
                'quantity': 100,
                'low_stock_threshold': 10
            }
        }
        response = self.client.post(self.product_list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify product and inventory were created successfully
        prod = Product.objects.get(id=response.data['id'])
        self.assertEqual(prod.inventory_record.quantity, 100)
        self.assertEqual(prod.inventory_record.low_stock_threshold, 10)
