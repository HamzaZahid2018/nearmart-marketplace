from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from apps.shops.models import Shop
from apps.shops.serializers import ShopSerializer
from apps.shops.permissions import IsShopOwnerOrAdmin
from apps.interactions.services import notify_user
from apps.interactions.models import Notification
from apps.users.permissions import IsMerchant


class ShopViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage Shops.
    Supports search, ordering, and customized list filtering based on roles.
    """
    queryset = Shop.objects.filter(is_deleted=False).select_related('owner')
    serializer_class = ShopSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'approved', 'verified']
    search_fields = ['name', 'description', 'category']
    ordering_fields = ['rating', 'review_count', 'created_at']
    ordering = ['-created_at']

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, IsMerchant]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsShopOwnerOrAdmin]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        queryset = Shop.objects.filter(is_deleted=False).select_related('owner')

        # Non-staff and anonymous users should only see approved shops by default
        # Unless a merchant wants to see their own shops (approved or pending)
        if not (user and user.is_authenticated and user.is_staff):
            if user and user.is_authenticated and user.role == 'merchant':
                queryset = queryset.filter(owner=user) | queryset.filter(approved=True)
            else:
                queryset = queryset.filter(approved=True)

        # Support latitude/longitude and distance range filter if provided
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        max_dist = self.request.query_params.get('max_dist_km')

        if lat and lng:
            try:
                # Basic bounding-box/Euclidean approximation for hyperlocal search
                lat_val = float(lat)
                lng_val = float(lng)
                # 1 degree lat is approx 111km, 1 degree lng is approx 111km * cos(lat)
                # We can filter directly or annotate distance
                if max_dist:
                    dist_val = float(max_dist)
                    # Rough bounding box filter
                    lat_delta = dist_val / 111.0
                    lng_delta = dist_val / (111.0 * 0.7)  # approximate cos(45 deg)
                    queryset = queryset.filter(
                        latitude__range=(lat_val - lat_delta, lat_val + lat_delta),
                        longitude__range=(lng_val - lng_delta, lng_val + lng_delta)
                    )
            except ValueError:
                pass

        return queryset.distinct()

    def perform_destroy(self, instance):
        # Soft delete the shop
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        # Also soft delete all of its products to maintain consistency!
        instance.products.update(is_deleted=True, deleted_at=timezone.now())

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """
        POST /api/shops/{id}/approve/
        Admin action to approve and verify a shop.
        """
        shop = self.get_object()
        shop.approved = True
        shop.verified = True
        shop.save()
        
        # Notify the shop owner
        notify_user(
            user=shop.owner,
            title="Shop Approved!",
            message=f"Congratulations! Your shop '{shop.name}' has been approved and is now live on the NearMart platform.",
            notification_type=Notification.Type.SHOP_APPROVAL
        )
        
        return Response(ShopSerializer(shop).data, status=status.HTTP_200_OK)
