from rest_framework import viewsets, permissions, filters, status
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from apps.products.models import Category, Product, ProductImage, Inventory
from apps.products.serializers import CategorySerializer, ProductSerializer
from apps.products.permissions import IsProductOwnerOrAdmin, IsCategoryAdminOrReadOnly
from apps.users.permissions import IsMerchant


class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Categories. Read-only for public, admin-only for edits.
    """
    queryset = Category.objects.filter(is_deleted=False)
    serializer_class = CategorySerializer
    permission_classes = [IsCategoryAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class ProductFilter(django_filters.FilterSet):
    """
    Custom filters to support price ranges, category slugs, status and shop filters.
    """
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    category_slug = django_filters.CharFilter(field_name="category__slug")

    class Meta:
        model = Product
        fields = ['shop', 'category', 'status', 'min_price', 'max_price', 'category_slug']


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Products.
    Enforces that only shop owners can create/update products under their shops.
    """
    queryset = Product.objects.filter(is_deleted=False, shop__is_deleted=False).select_related(
        'shop', 'category', 'inventory_record'
    ).prefetch_related('images')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'rating', 'sales_count', 'created_at']
    ordering = ['-created_at']

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, IsMerchant]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsProductOwnerOrAdmin]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        # Validate that the selected shop is owned by the logged-in merchant
        shop = serializer.validated_data.get('shop')
        if not self.request.user.is_staff and shop.owner != self.request.user:
            raise ValidationError("You do not have permission to add products to this shop.")
        serializer.save()

    def perform_destroy(self, instance):
        # Soft-delete the product
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
