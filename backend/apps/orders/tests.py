from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.products.models import Category, Product, Inventory
from apps.users.models import Address
from apps.orders.models import Cart, CartItem, Order, Payment

User = get_user_model()


class CartAndOrderTests(APITestCase):
    """
    Unit tests for complete Cart operations, Hyperlocal single-shop validations,
    Checkout flows, Inventory deductions, and Cancel refunds.
    """
    def setUp(self):
        self.buyer = User.objects.create_user(username='buyer', password='password', role='customer')
        self.merchant = User.objects.create_user(username='merchant', password='password', role='merchant')
        self.other_merchant = User.objects.create_user(username='other_m', password='password', role='merchant')

        # Create shops
        self.shop_a = Shop.objects.create(owner=self.merchant, name='Shop A', category='G', approved=True)
        self.shop_b = Shop.objects.create(owner=self.other_merchant, name='Shop B', category='G', approved=True)

        self.category = Category.objects.create(name='Fruits')

        # Create products and inventories
        self.apple = Product.objects.create(shop=self.shop_a, category=self.category, name='Apple', price=1.50)
        self.apple_stock = Inventory.objects.create(product=self.apple, quantity=100)

        self.orange = Product.objects.create(shop=self.shop_a, category=self.category, name='Orange', price=2.00)
        self.orange_stock = Inventory.objects.create(product=self.orange, quantity=5)

        self.milk = Product.objects.create(shop=self.shop_b, category=self.category, name='Milk', price=3.00)
        self.milk_stock = Inventory.objects.create(product=self.milk, quantity=10)

        # Create address
        self.address = Address.objects.create(
            user=self.buyer, title='Home', street_address='My St',
            city='Metropolis', state='NY', zip_code='10001'
        )

        # URLs
        self.cart_active_url = reverse('orders:cart-active')
        self.cart_add_url = reverse('orders:cart-add-item')
        self.checkout_url = reverse('orders:cart-checkout')
        self.order_list_url = reverse('orders:order-list')

        self.client.force_authenticate(user=self.buyer)

    def test_active_cart_get_or_create(self):
        response = self.client.get(self.cart_active_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 0)
        self.assertEqual(float(response.data['subtotal']), 0.00)

    def test_add_item_to_cart_success(self):
        data = {
            'product': self.apple.id,
            'quantity': 3
        }
        response = self.client.post(self.cart_add_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(float(response.data['subtotal']), 4.50)  # 3 * 1.50

    def test_hyperlocal_single_shop_limit(self):
        # Add Apple (Shop A)
        self.client.post(self.cart_add_url, {'product': self.apple.id, 'quantity': 1}, format='json')
        
        # Adding Milk (Shop B) should trigger 400 Bad Request
        response = self.client.post(self.cart_add_url, {'product': self.milk.id, 'quantity': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Single-Shop Limit", response.data['error'])

    def test_checkout_flow_deducts_inventory_clears_cart(self):
        # 1. Add Apple and Orange to Cart
        self.client.post(self.cart_add_url, {'product': self.apple.id, 'quantity': 10}, format='json')
        self.client.post(self.cart_add_url, {'product': self.orange.id, 'quantity': 2}, format='json')

        # 2. Call checkout
        checkout_data = {
            'address': self.address.id,
            'payment_method': 'card'
        }
        response = self.client.post(self.checkout_url, checkout_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Subtotal: 10*1.5 + 2*2 = 19.0. Fee: 3.5. Total: 22.5
        self.assertEqual(float(response.data['subtotal']), 19.00)
        self.assertEqual(float(response.data['total']), 22.50)
        self.assertEqual(response.data['payment_method'], 'card')

        # 3. Check inventory deducted
        self.apple_stock.refresh_from_db()
        self.assertEqual(self.apple_stock.quantity, 90)  # 100 - 10
        self.orange_stock.refresh_from_db()
        self.assertEqual(self.orange_stock.quantity, 3)   # 5 - 2

        # 4. Check cart is now cleared
        response_cart = self.client.get(self.cart_active_url)
        self.assertEqual(len(response_cart.data['items']), 0)

        # 5. Check payment record is approved (card checkout)
        order_id = response.data['id']
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.payment_record.status, Payment.Status.SUCCESS)

    def test_cancel_order_restores_inventory(self):
        # 1. Checkout to create order
        self.client.post(self.cart_add_url, {'product': self.apple.id, 'quantity': 10}, format='json')
        checkout_response = self.client.post(self.checkout_url, {'address': self.address.id, 'payment_method': 'cod'}, format='json')
        order_id = checkout_response.data['id']

        self.apple_stock.refresh_from_db()
        self.assertEqual(self.apple_stock.quantity, 90)

        # 2. Cancel order
        cancel_url = reverse('orders:order-cancel', kwargs={'pk': order_id})
        cancel_response = self.client.post(cancel_url)
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_response.data['status'], 'cancelled')

        # 3. Verify stock restored
        self.apple_stock.refresh_from_db()
        self.assertEqual(self.apple_stock.quantity, 100)
