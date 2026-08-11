from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from apps.core_utils import BaseModel
from apps.products.models import Product
from apps.shops.models import Shop


class Review(BaseModel):
    """
    User reviews and ratings for both products and shops.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_index=True
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        db_index=True
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        db_index=True
    )
    
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating scores between 1 and 5"
    )
    comment = models.TextField()

    class Meta:
        db_table = 'nearmart_reviews'
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['rating', 'created_at']),
        ]

    def clean(self):
        # A review must target either a product or a shop (or both)
        if not self.product and not self.shop:
            raise ValidationError("A review must be associated with either a Product or a Shop.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        target = f"Product: {self.product.name}" if self.product else f"Shop: {self.shop.name}"
        return f"Review by {self.user.username} for {target} ({self.rating}★)"


class Wishlist(BaseModel):
    """
    Maintains items that users wish list or bookmark for later.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
        db_index=True
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by'
    )

    class Meta:
        db_table = 'nearmart_wishlists'
        verbose_name = 'Wishlist Item'
        verbose_name_plural = 'Wishlist Items'
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.username} wants {self.product.name}"


class Notification(BaseModel):
    """
    Operational, transactional, or marketing notifications pushed to users.
    """
    class Type(models.TextChoices):
        SYSTEM = 'system', 'System Message'
        ORDER_STATUS = 'order_status', 'Order Status Alert'
        PROMOTION = 'promotion', 'Promotion Alert'
        CHAT = 'chat', 'New Chat Message'
        LOW_STOCK = 'low_stock', 'Low Stock Alert'
        SHOP_APPROVAL = 'shop_approval', 'Shop Approval Alert'
        PAYMENT_SUCCESS = 'payment_success', 'Payment Success Alert'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    
    notification_type = models.CharField(
        max_length=30,
        choices=Type.choices,
        default=Type.SYSTEM,
        db_index=True
    )

    class Meta:
        db_table = 'nearmart_notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert for {self.user.username}: {self.title}"
