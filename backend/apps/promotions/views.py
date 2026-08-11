from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from apps.promotions.models import Coupon
from apps.promotions.serializers import CouponSerializer
from apps.promotions.permissions import IsAdminOrCreateOnly


class CouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage Coupons.
    Provides a helper action to dynamically validate a coupon code.
    """
    queryset = Coupon.objects.filter(is_deleted=False)
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrCreateOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['active']
    lookup_field = 'code'  # Look up by code instead of ID for natural URL mapping

    def get_queryset(self):
        # Admins can see all coupons, standard users can only see currently active/valid ones
        queryset = Coupon.objects.filter(is_deleted=False)
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(active=True, start_date__lte=timezone.now())
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def validate_code(self, request):
        """
        Validates if a coupon code can be applied to a given cart amount.
        Post body format: {"code": "SUMMER20", "amount": 100.00}
        """
        code = request.data.get('code')
        amount_str = request.data.get('amount')

        if not code or amount_str is None:
            return Response(
                {"valid": False, "error": "Please provide both 'code' and 'amount'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = float(amount_str)
        except ValueError:
            return Response(
                {"valid": False, "error": "Invalid format for 'amount'. Must be a decimal number."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Check active coupons
            coupon = Coupon.objects.get(code__iexact=code, is_deleted=False)
        except Coupon.DoesNotExist:
            return Response(
                {"valid": False, "error": "This coupon code does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate general active and date parameters
        if not coupon.is_currently_valid:
            return Response(
                {"valid": False, "error": "This coupon is either inactive or has expired."},
                status=status.HTTP_200_OK
            )

        # Check minimum spend requirement
        if amount < float(coupon.min_spend):
            return Response({
                "valid": False, 
                "error": f"Minimum spend of ${coupon.min_spend} is required to use this coupon."
            }, status=status.HTTP_200_OK)

        # Calculate discount amount
        discount = (amount * coupon.discount_percent) / 100.00
        if coupon.max_discount_amount is not None:
            max_disc = float(coupon.max_discount_amount)
            if discount > max_disc:
                discount = max_disc

        return Response({
            "valid": True,
            "code": coupon.code,
            "discount_percent": coupon.discount_percent,
            "discount_amount": round(discount, 2),
            "final_amount": round(max(0.00, amount - discount), 2)
        }, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
