from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core_utils import BaseModel


class Coupon(BaseModel):
    """
    Stores discount voucher configurations applied to Carts or Orders.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    discount_percent = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Percentage discount value (1 to 100)"
    )
    
    active = models.BooleanField(default=True, db_index=True)
    
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    
    min_spend = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00)]
    )
    max_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(0.00)]
    )

    class Meta:
        db_table = 'nearmart_coupons'
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} ({self.discount_percent}% OFF)"

    @property
    def is_expired(self):
        if self.end_date and timezone.now() > self.end_date:
            return True
        return False

    @property
    def is_currently_valid(self):
        now = timezone.now()
        return self.active and self.start_date <= now and (not self.end_date or now <= self.end_date)
