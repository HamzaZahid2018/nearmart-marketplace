from rest_framework import serializers
from apps.promotions.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    """
    Serializer to manage marketing promotional coupons.
    """
    is_expired = serializers.BooleanField(read_only=True)
    is_currently_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'description', 'discount_percent', 'active',
            'start_date', 'end_date', 'min_spend', 'max_discount_amount',
            'is_expired', 'is_currently_valid', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Coupon start date cannot be after the end date.")
            
        return attrs
