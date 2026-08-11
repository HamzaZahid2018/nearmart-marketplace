from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from apps.core_utils import BaseModel


class Shop(BaseModel):
    """
    Merchant stores in the hyperlocal marketplace.
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_shops',
        db_index=True
    )
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, db_index=True, help_text="e.g. 'Grocery', 'Pharmacy', 'Breads'")
    
    image = models.CharField(max_length=500, blank=True, null=True)
    
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=5.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    review_count = models.PositiveIntegerField(default=0)
    
    approved = models.BooleanField(default=False, db_index=True)
    verified = models.BooleanField(default=False)
    
    revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.0)]
    )
    
    delivery_range_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5.00,
        validators=[MinValueValidator(0.0)]
    )
    
    # Location tracking
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        db_table = 'nearmart_shops'
        verbose_name = 'Shop'
        verbose_name_plural = 'Shops'
        indexes = [
            models.Index(fields=['approved', 'category']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            # Generate unique slug
            base_slug = slugify(self.name) or "shop"
            slug = base_slug
            count = 1
            while Shop.all_objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{count}"
                count += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
