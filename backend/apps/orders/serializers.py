from rest_framework import serializers
from apps.products.models import Product, Inventory
from apps.promotions.models import Coupon
from apps.promotions.serializers import CouponSerializer
from apps.orders.models import Cart, CartItem, Order, OrderItem, Payment


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual items in the user's active shopping cart.
    """
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True)
    item_total = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_price', 'product_image', 'quantity', 'item_total']
        read_only_fields = ['id', 'item_total']

    def get_product_image(self, obj):
        primary_image = obj.product.images.filter(is_primary=True, is_deleted=False).first()
        if primary_image:
            return primary_image.image_url
        first_img = obj.product.images.filter(is_deleted=False).first()
        return first_img.image_url if first_img else None

    def get_item_total(self, obj):
        return round(float(obj.product.price) * obj.quantity, 2)

    def validate(self, attrs):
        product = attrs.get('product')
        quantity = attrs.get('quantity', 1)

        # Check stock limits
        try:
            inventory = product.inventory_record
            if inventory.quantity < quantity:
                raise serializers.ValidationError(f"Insufficient stock for {product.name}. Only {inventory.quantity} items available.")
        except Inventory.DoesNotExist:
            raise serializers.ValidationError("This product does not have an inventory record.")

        return attrs


class CartSerializer(serializers.ModelSerializer):
    """
    Serializer representing the user's active Cart.
    Calculates subtotal, discounts from coupon, and final total.
    """
    items = CartItemSerializer(many=True, read_only=True)
    coupon_details = CouponSerializer(source='coupon', read_only=True)
    
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'coupon', 'coupon_details', 'items', 'subtotal', 'discount', 'delivery_fee', 'total']
        read_only_fields = ['id', 'subtotal', 'discount', 'delivery_fee', 'total']

    def get_subtotal(self, obj):
        return sum(item.quantity * float(item.product.price) for item in obj.items.filter(is_deleted=False))

    def get_discount(self, obj):
        subtotal = self.get_subtotal(obj)
        if obj.coupon and obj.coupon.is_currently_valid and subtotal >= float(obj.coupon.min_spend):
            discount = (subtotal * obj.coupon.discount_percent) / 100.00
            if obj.coupon.max_discount_amount:
                max_disc = float(obj.coupon.max_discount_amount)
                if discount > max_disc:
                    discount = max_disc
            return round(discount, 2)
        return 0.00

    def get_delivery_fee(self, obj):
        # Default delivery fee is $3.50 if cart has items, otherwise 0
        subtotal = self.get_subtotal(obj)
        return 3.50 if subtotal > 0 else 0.00

    def get_total(self, obj):
        subtotal = self.get_subtotal(obj)
        discount = self.get_discount(obj)
        delivery_fee = self.get_delivery_fee(obj)
        return round(max(0.00, subtotal - discount + delivery_fee), 2)


class OrderItemSerializer(serializers.ModelSerializer):
    """
    Read-only snapshot serializer for items purchased in an order.
    """
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'name', 'price', 'quantity', 'item_total']
        read_only_fields = ['id', 'product', 'name', 'price', 'quantity', 'item_total']

    def get_item_total(self, obj):
        return round(float(obj.price) * obj.quantity, 2)


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer to record and retrieve transaction records.
    """
    class Meta:
        model = Payment
        fields = ['id', 'order', 'transaction_id', 'amount', 'status', 'provider', 'gateway_response', 'created_at']
        read_only_fields = ['id', 'amount', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for placing, managing, and reviewing Orders.
    """
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(source='payment_record', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_username', 'shop', 'shop_name', 
            'address', 'frozen_address_text', 'subtotal', 'delivery_fee', 
            'discount', 'total', 'status', 'payment_method', 'timeline_logs', 
            'items', 'payment', 'created_at'
        ]
        read_only_fields = [
            'id', 'customer', 'frozen_address_text', 'subtotal', 'delivery_fee', 
            'discount', 'total', 'timeline_logs', 'created_at'
        ]
