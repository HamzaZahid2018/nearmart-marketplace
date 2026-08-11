from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.core_utils import BaseModel
from apps.shops.models import Shop
from apps.products.models import Product


class Cart(BaseModel):
    """
    User's active shopping cart session.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart'
    )
    coupon = models.ForeignKey(
        'promotions.Coupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='applied_carts'
    )

    class Meta:
        db_table = 'nearmart_carts'
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'

    def __str__(self):
        try:
            return f"Cart of {self.user.username}"
        except AttributeError:
            return f"Cart {self.id}"


class CartItem(BaseModel):
    """
    Individual product listings saved inside the active Cart.
    """
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        db_index=True
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='cart_entries'
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )

    class Meta:
        db_table = 'nearmart_cart_items'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        unique_together = ('cart', 'product')

    def __str__(self):
        return f"{self.quantity}x {self.product.name} in Cart"


class Order(BaseModel):
    """
    Stores purchased transaction details, delivery routes, and invoice metrics.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PREPARING = 'preparing', 'Preparing'
        DISPATCHED = 'dispatched', 'Dispatched'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'

    class PaymentMethod(models.TextChoices):
        CARD = 'card', 'Credit/Debit Card'
        COD = 'cod', 'Cash on Delivery'
        WALLET = 'wallet', 'NearMart Wallet'
        JAZZCASH = 'jazzcash', 'JazzCash'
        EASYPAISA = 'easypaisa', 'Easypaisa'

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        db_index=True
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.PROTECT,
        related_name='orders',
        db_index=True
    )
    
    # Snapshot user address details to freeze delivery record
    address = models.ForeignKey(
        'users.Address',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    frozen_address_text = models.TextField(help_text="Frozen text representation of address at order placement time")
    
    # Financial breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.00)])
    delivery_fee = models.DecimalField(max_digits=6, decimal_places=2, default=3.50, validators=[MinValueValidator(0.00)])
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0.00)])
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.00)])
    
    # Fulfillment tracking state
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD
    )
    
    # Timeline checklist logs (rendered dynamically or frozen in JSON)
    timeline_logs = models.JSONField(default=dict, blank=True, help_text="Chronological timestamps of fulfillment logs")

    class Meta:
        db_table = 'nearmart_orders'
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        try:
            return f"Order {self.id} for {self.customer.username} ({self.status.upper()})"
        except AttributeError:
            return f"Order {self.id} ({self.status.upper()})"


class OrderItem(BaseModel):
    """
    Sub-items purchased inside a successfully checked out Order.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        db_index=True
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_entries'
    )
    # Freeze the name and unit price to safeguard historical ledger logs
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        db_table = 'nearmart_order_items'
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.quantity}x {self.name} (Order {self.order_id})"


class Payment(BaseModel):
    """
    Captures financial transaction states linked to specific Orders.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Successful'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    order = models.OneToOneField(
        Order,
        on_delete=models.PROTECT,
        related_name='payment_record'
    )
    transaction_id = models.CharField(max_length=150, unique=True, db_index=True, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    provider = models.CharField(max_length=100, default='COD', help_text="e.g. 'Stripe', 'PayPal', 'Cash', 'JazzCash', 'Easypaisa'")
    
    gateway_response = models.JSONField(default=dict, blank=True, help_text="Raw payload returned by third party API gateway")

    class Meta:
        db_table = 'nearmart_payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return f"Payment {self.id} for Order {self.order_id} ({self.status})"
