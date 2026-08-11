from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core_utils import BaseModel
from apps.shops.models import Shop


class Category(BaseModel):
    """
    Product categories across the platform (e.g. Fresh Fruits, Bakery, Dairy).
    """
    name = models.CharField(max_length=100, unique=True, db_index=True)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    image = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'nearmart_categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(BaseModel):
    """
    A specific item listed for sale by a Shop.
    """
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DRAFT = 'draft', 'Draft'
        OUT_OF_STOCK = 'out_of_stock', 'Out of Stock'

    shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        related_name='products',
        db_index=True
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products',
        db_index=True
    )
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    unit = models.CharField(max_length=50, default='item', help_text="e.g. 'kg', 'pack', 'unit', 'piece'")
    
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=5.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    review_count = models.PositiveIntegerField(default=0)
    sales_count = models.PositiveIntegerField(default=0)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )

    class Meta:
        db_table = 'nearmart_products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        unique_together = ('shop', 'slug')
        indexes = [
            models.Index(fields=['price', 'status']),
            models.Index(fields=['category', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "product"
            slug = base_slug
            count = 1
            while Product.all_objects.filter(shop=self.shop, slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{count}"
                count += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class ProductImage(BaseModel):
    """
    Supports multiple product images.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        db_index=True
    )
    image_url = models.CharField(max_length=500)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'nearmart_product_images'
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['-is_primary', 'created_at']

    def save(self, *args, **kwargs):
        if self.is_primary:
            # Set other images for this product as secondary
            ProductImage.objects.filter(product=self.product, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.product.name}"


class Inventory(BaseModel):
    """
    Maintains real-time stock limits for products.
    """
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='inventory_record'
    )
    quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    class Meta:
        db_table = 'nearmart_inventory'
        verbose_name = 'Inventory Record'
        verbose_name_plural = 'Inventory Records'

    def __str__(self):
        return f"Stock: {self.quantity} items for {self.product.name}"

    @property
    def is_out_of_stock(self):
        return self.quantity == 0

    @property
    def is_low_stock(self):
        return self.quantity <= self.low_stock_threshold
