import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from apps.core_utils import BaseModel


class User(AbstractUser):
    """
    Custom user model supporting role divisions and custom UUID primary keys.
    """
    class Role(models.TextChoices):
        CUSTOMER = 'customer', 'Customer'
        MERCHANT = 'merchant', 'Merchant'
        ADMIN = 'admin', 'Administrator'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nearmart_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role', 'email']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Address(BaseModel):
    """
    Store delivery and billing addresses for users.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='addresses',
        db_index=True
    )
    title = models.CharField(max_length=100, default='Home', help_text="e.g. 'Home', 'Office'")
    street_address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20, db_index=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'nearmart_addresses'
        verbose_name = 'Address'
        verbose_name_plural = 'Addresses'
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        # If set to default, unset other addresses default flags for this user
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.street_address}, {self.city}"
