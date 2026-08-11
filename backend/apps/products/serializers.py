from rest_framework import serializers
from apps.products.models import Category, Product, ProductImage, Inventory


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Product Categories.
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for Product gallery images.
    """
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image_url', 'is_primary']
        read_only_fields = ['id', 'product']


class InventorySerializer(serializers.ModelSerializer):
    """
    Serializer for tracking real-time stock and alerts.
    """
    is_out_of_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'product', 'quantity', 'low_stock_threshold', 'is_out_of_stock', 'is_low_stock']
        read_only_fields = ['id', 'product']


class ProductSerializer(serializers.ModelSerializer):
    """
    Complete Serializer for Products.
    Integrates nested galleries (ProductImage) and stock levels (Inventory)
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    
    images = ProductImageSerializer(many=True, required=False)
    inventory = InventorySerializer(source='inventory_record', required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'shop', 'shop_name', 'category', 'category_name', 
            'name', 'slug', 'description', 'price', 'unit', 
            'rating', 'review_count', 'sales_count', 'status', 
            'images', 'inventory', 'created_at'
        ]
        read_only_fields = ['id', 'slug', 'rating', 'review_count', 'sales_count', 'created_at']

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        inventory_data = validated_data.pop('inventory_record', None)

        product = Product.objects.create(**validated_data)

        # Create images if provided
        for img_data in images_data:
            ProductImage.objects.create(product=product, **img_data)

        # Create default or custom inventory
        qty = inventory_data.get('quantity', 0) if inventory_data else 0
        threshold = inventory_data.get('low_stock_threshold', 5) if inventory_data else 5
        Inventory.objects.create(product=product, quantity=qty, low_stock_threshold=threshold)

        return product

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', None)
        inventory_data = validated_data.pop('inventory_record', None)

        # Update standard product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update images if provided in request
        if images_data is not None:
            # Clear old and replace, or update selectively. Let's do clear & replace for simple UI sync:
            instance.images.all().delete()
            for img_data in images_data:
                ProductImage.objects.create(product=instance, **img_data)

        # Update inventory if provided
        if inventory_data is not None:
            inventory = getattr(instance, 'inventory_record', None)
            if not inventory:
                inventory = Inventory(product=instance)
            inventory.quantity = inventory_data.get('quantity', inventory.quantity)
            inventory.low_stock_threshold = inventory_data.get('low_stock_threshold', inventory.low_stock_threshold)
            inventory.save()

        return instance
