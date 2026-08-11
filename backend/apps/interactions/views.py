from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Avg
from apps.interactions.models import Review, Wishlist, Notification
from apps.interactions.serializers import ReviewSerializer, WishlistSerializer, NotificationSerializer
from apps.interactions.permissions import IsReviewAuthorOrAdmin, IsInteractionOwner


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage User Reviews and Ratings.
    Dynamically recalculates the target Product's or Shop's aggregate rating stats.
    """
    queryset = Review.objects.filter(is_deleted=False).select_related('user', 'product', 'shop')
    serializer_class = ReviewSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rating', 'product', 'shop']
    ordering_fields = ['rating', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsReviewAuthorOrAdmin]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]

    def _update_rating_aggregates(self, product=None, shop=None):
        """
        Calculates and updates average ratings and count values for products and shops.
        """
        if product:
            stats = Review.objects.filter(product=product, is_deleted=False).aggregate(avg_rating=Avg('rating'), count=Avg('id'))
            product.rating = stats['avg_rating'] or 5.0
            product.review_count = Review.objects.filter(product=product, is_deleted=False).count()
            product.save()
            
            # If product rating changed, update the shop rating too
            shop = product.shop
            
        if shop:
            stats = Review.objects.filter(shop=shop, is_deleted=False).aggregate(avg_rating=Avg('rating'))
            shop.rating = stats['avg_rating'] or 5.0
            shop.review_count = Review.objects.filter(shop=shop, is_deleted=False).count()
            shop.save()

    def perform_create(self, serializer):
        review = serializer.save()
        self._update_rating_aggregates(product=review.product, shop=review.shop)

    def perform_update(self, serializer):
        review = serializer.save()
        self._update_rating_aggregates(product=review.product, shop=review.shop)

    def perform_destroy(self, instance):
        product = instance.product
        shop = instance.shop
        instance.delete()  # Hard delete review or soft delete. Let's do hard delete to clean up DB, or soft delete:
        # Since we use BaseModel, we soft delete:
        instance.is_deleted = True
        instance.save()
        self._update_rating_aggregates(product=product, shop=shop)


class WishlistViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage wishlist bookmarks.
    Enforces privacy so users can only access their own lists.
    """
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated, IsInteractionOwner]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user, is_deleted=False)

    @action(detail=False, methods=['post'], url_path='remove_product')
    def remove_product(self, request):
        product_id = request.data.get('product')
        if not product_id:
            return Response({"error": "Product ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        # Soft delete matching wishlist item
        Wishlist.objects.filter(user=request.user, product_id=product_id, is_deleted=False).update(
            is_deleted=True,
            deleted_at=timezone.now()
        )
        return Response({"status": "Removed product from wishlist successfully."}, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet to view and manage notifications.
    Provides utility actions to mark notifications as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsInteractionOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'notification_type']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user, is_deleted=False)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        POST /api/interactions/notifications/mark_all_read/
        """
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"status": "All active alerts marked as read successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        POST /api/interactions/notifications/{id}/mark_read/
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
