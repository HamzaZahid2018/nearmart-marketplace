from rest_framework import serializers
from apps.products.models import Product
from apps.products.serializers import ProductSerializer
from apps.interactions.models import Review, Wishlist, Notification


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for User Reviews and Ratings.
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_username', 'product', 'product_name', 'shop', 'shop_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def validate(self, attrs):
        product = attrs.get('product')
        shop = attrs.get('shop')

        if not product and not shop:
            raise serializers.ValidationError("A review must target either a Product or a Shop.")
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WishlistSerializer(serializers.ModelSerializer):
    """
    Serializer for bookmarked items.
    """
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'user', 'product', 'product_details', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def create(self, validated_data):
        user = self.context['request'].user
        product = validated_data['product']

        if Wishlist.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("This product is already in your wishlist.")

        validated_data['user'] = user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for transactional or marketing push notifications.
    Enforces that standard users can only mutate 'is_read'.
    """
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'is_read', 'notification_type', 'created_at']
        read_only_fields = ['id', 'user', 'title', 'message', 'notification_type', 'created_at']
