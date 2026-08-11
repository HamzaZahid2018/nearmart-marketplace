from rest_framework import serializers
from apps.shops.models import Shop


class ShopSerializer(serializers.ModelSerializer):
    """
    Serializer to manage Merchant Shops.
    Provides strict field visibility: only admins can approve shops or alter revenue fields.
    """
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'owner', 'owner_username', 'name', 'slug', 'description', 
            'category', 'image', 'rating', 'review_count', 'approved', 
            'verified', 'revenue', 'delivery_range_km', 'latitude', 'longitude', 'created_at'
        ]
        read_only_fields = ['id', 'owner', 'slug', 'rating', 'review_count', 'created_at']

    def create(self, validated_data):
        # Assign the logged-in user as the owner
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        # Safeguard: only admin/staff can set 'approved', 'verified' or 'revenue'
        if user and not user.is_staff:
            if 'approved' in attrs:
                attrs.pop('approved')
            if 'verified' in attrs:
                attrs.pop('verified')
            if 'revenue' in attrs:
                attrs.pop('revenue')
                
        return attrs
