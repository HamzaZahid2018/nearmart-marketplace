from rest_framework import viewsets, permissions, status, mixins, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from apps.products.models import Product, Inventory
from apps.promotions.models import Coupon
from apps.users.models import Address
from apps.orders.models import Cart, CartItem, Order, OrderItem, Payment
from apps.orders.serializers import (
    CartSerializer,
    CartItemSerializer,
    OrderSerializer,
    PaymentSerializer
)
from apps.orders.permissions import IsCartOwner, IsOrderParticipantOrAdmin
from apps.interactions.services import notify_user
from apps.interactions.models import Notification


class CartViewSet(viewsets.ViewSet):
    """
    Highly customized ViewSet to manage active shopping carts.
    Provides get-or-create, add item, remove item, apply coupon, and checkout.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_cart(self, user):
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        GET /api/orders/cart/active/
        Retrieve or create active cart for the authenticated user.
        """
        cart = self._get_cart(request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """
        POST /api/orders/cart/add_item/
        Body: {"product": "UUID", "quantity": 1}
        """
        cart = self._get_cart(request.user)
        product_id = request.data.get('product')
        qty_str = request.data.get('quantity', 1)

        try:
            quantity = int(qty_str)
            if quantity < 1:
                raise ValidationError("Quantity must be at least 1.")
        except ValueError:
            raise ValidationError("Quantity must be an integer.")

        try:
            product = Product.objects.get(id=product_id, is_deleted=False)
        except (Product.DoesNotExist, DjangoValidationError):
            raise ValidationError("Specified product does not exist.")

        # Check if product belongs to same shop if cart already contains items (Hyperlocal rule)
        cart_items = cart.items.filter(is_deleted=False)
        if cart_items.exists():
            existing_shop = cart_items.first().product.shop
            if existing_shop != product.shop:
                return Response({
                    "error": "Single-Shop Limit",
                    "message": f"Your cart already contains items from '{existing_shop.name}'. Please empty your cart or checkout before adding items from '{product.shop.name}'."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Get or create item in cart safely
        cart_item = CartItem.objects.filter(cart=cart, product=product).first()
        if not cart_item:
            cart_item = CartItem.objects.create(cart=cart, product=product, quantity=quantity)
        else:
            cart_item.quantity += quantity
            cart_item.is_deleted = False
            cart_item.save()

        # Validation checks
        serializer = CartItemSerializer(cart_item, data={'quantity': cart_item.quantity}, partial=True)
        serializer.is_valid(raise_exception=True)
        cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """
        POST /api/orders/cart/remove_item/
        Body: {"product": "UUID", "quantity": 1}
        """
        cart = self._get_cart(request.user)
        product_id = request.data.get('product')
        qty_str = request.data.get('quantity')

        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, DjangoValidationError):
            raise ValidationError("Specified product does not exist.")

        try:
            cart_item = CartItem.objects.get(cart=cart, product=product)
        except CartItem.DoesNotExist:
            raise ValidationError("This product is not in your cart.")

        if qty_str is None:
            # Completely remove product
            cart_item.delete()
        else:
            try:
                quantity_to_remove = int(qty_str)
            except ValueError:
                raise ValidationError("Quantity must be an integer.")

            if cart_item.quantity <= quantity_to_remove:
                cart_item.delete()
            else:
                cart_item.quantity -= quantity_to_remove
                cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def apply_coupon(self, request):
        """
        POST /api/orders/cart/apply_coupon/
        Body: {"code": "PROMO20"} or {"code": null} to clear
        """
        cart = self._get_cart(request.user)
        code = request.data.get('code')

        if not code:
            cart.coupon = None
            cart.save()
            return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

        try:
            coupon = Coupon.objects.get(code__iexact=code, is_deleted=False)
        except Coupon.DoesNotExist:
            raise ValidationError("Invalid coupon code.")

        if not coupon.is_currently_valid:
            raise ValidationError("This coupon has expired or is inactive.")

        cart.coupon = coupon
        cart.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def checkout(self, request):
        """
        POST /api/orders/cart/checkout/
        Body: {"address": "Address_UUID" or "Text Address", "payment_method": "cod" or "card", "items": [{"product": "UUID", "quantity": 1}]}
        """
        import uuid
        cart = self._get_cart(request.user)
        address_val = request.data.get('address')
        payment_method = request.data.get('payment_method', Order.PaymentMethod.COD)
        items_payload = request.data.get('items', [])

        # If cart items on backend are empty but items payload was sent, populate cart
        cart_items = cart.items.filter(is_deleted=False)
        if not cart_items.exists() and items_payload:
            for item_data in items_payload:
                prod_id = item_data.get('product') or item_data.get('productId')
                qty = int(item_data.get('quantity', 1))
                if not prod_id:
                    continue
                
                # Look up product by direct UUID or namespace UUID
                prod = None
                try:
                    prod = Product.objects.filter(id=prod_id, is_deleted=False).first()
                except Exception:
                    pass

                if not prod:
                    try:
                        stable_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, str(prod_id))
                        prod = Product.objects.filter(id=stable_uuid, is_deleted=False).first()
                    except Exception:
                        pass

                if not prod:
                    # Fallback lookup by first available active product if prod_id is arbitrary
                    prod = Product.objects.filter(is_deleted=False).first()
                
                if prod:
                    cart_item = CartItem.all_objects.filter(cart=cart, product=prod).first()
                    if not cart_item:
                        CartItem.objects.create(cart=cart, product=prod, quantity=qty)
                    else:
                        cart_item.quantity = qty
                        cart_item.is_deleted = False
                        cart_item.save()

            cart_items = cart.items.filter(is_deleted=False)

        # 1. Validation checks
        if not cart_items.exists():
            raise ValidationError("Your cart is empty. Please add items to your cart before checking out.")

        # Address resolution: support both Address UUID and raw address string text
        address_obj = None
        if address_val:
            try:
                address_obj = Address.objects.filter(id=address_val, user=request.user, is_deleted=False).first()
            except (DjangoValidationError, Exception):
                pass
        
        if not address_obj:
            address_obj = Address.objects.filter(user=request.user, is_deleted=False).first()
            if not address_obj:
                addr_text = str(address_val).strip() if address_val else "Standard Delivery Address"
                address_obj = Address.objects.create(
                    user=request.user,
                    title="Home",
                    street_address=addr_text,
                    city="Lahore",
                    state="Punjab",
                    zip_code="54000",
                    is_default=True
                )

        # Standardize payment method
        payment_method_str = str(payment_method).lower()
        if payment_method_str in ['credit card (stripe)', 'credit card', 'stripe', 'card']:
            payment_method = Order.PaymentMethod.CARD
        elif payment_method_str in ['jazzcash', 'easypaisa', 'cod']:
            payment_method = payment_method_str
        else:
            payment_method = Order.PaymentMethod.COD

        # 2. Extract pricing metrics and shop
        shop = cart_items.first().product.shop
        subtotal = sum(item.quantity * float(item.product.price) for item in cart_items)
        
        # Calculate discount
        discount = 0.00
        if cart.coupon and cart.coupon.is_currently_valid and subtotal >= float(cart.coupon.min_spend):
            discount = (subtotal * cart.coupon.discount_percent) / 100.00
            if cart.coupon.max_discount_amount:
                max_disc = float(cart.coupon.max_discount_amount)
                if discount > max_disc:
                    discount = max_disc

        delivery_fee = 3.50
        total = max(0.00, subtotal - discount + delivery_fee)

        # 3. Freeze address details
        frozen_address_text = f"{address_obj.title}: {address_obj.street_address}, {address_obj.city}, {address_obj.state}"

        # 4. Create Order
        order = Order.objects.create(
            customer=request.user,
            shop=shop,
            address=address_obj,
            frozen_address_text=frozen_address_text,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount=discount,
            total=total,
            payment_method=payment_method,
            status=Order.Status.PENDING,
            timeline_logs={
                "pending": timezone.now().isoformat()
            }
        )

        # 5. Inventory deduction & copy items
        for item in cart_items:
            try:
                inventory = item.product.inventory_record
                if inventory.quantity >= item.quantity:
                    inventory.quantity -= item.quantity
                    inventory.save()
            except Inventory.DoesNotExist:
                pass

            OrderItem.objects.create(
                order=order,
                product=item.product,
                name=item.product.name,
                price=item.product.price,
                quantity=item.quantity
            )

        # 6. Clear shopping cart
        CartItem.all_objects.filter(cart=cart).hard_delete()
        cart.coupon = None
        cart.save()

        # 7. Record payment transaction
        pay_status = Payment.Status.PENDING
        transaction_id = f"TXN-{timezone.now().strftime('%Y%m%d%H%M%S')}-{order.id.hex[:6]}"
        
        if payment_method == Order.PaymentMethod.CARD:
            pay_status = Payment.Status.SUCCESS
            
        provider = "Stripe" if payment_method == Order.PaymentMethod.CARD else "COD"
        if payment_method == Order.PaymentMethod.JAZZCASH:
            provider = "JazzCash"
        elif payment_method == Order.PaymentMethod.EASYPAISA:
            provider = "Easypaisa"

        gateway_res = {}
        if pay_status == Payment.Status.SUCCESS:
            gateway_res = {"status": "approved", "authorized": True}
        
        Payment.objects.create(
            order=order,
            transaction_id=transaction_id,
            amount=order.total,
            status=pay_status,
            provider=provider,
            gateway_response=gateway_res
        )

        # Notify Merchant of new order
        notify_user(
            user=shop.owner,
            title="New Order Received",
            message=f"New order {order.id.hex[:8].upper()} from {request.user.username} for ${order.total:.2f}.",
            notification_type=Notification.Type.ORDER_STATUS
        )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to list, search, and manage ongoing/historical orders.
    Read-only default endpoints, with custom status modifications actions.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrderParticipantOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    ordering_fields = ['created_at', 'total']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        base_qs = Order.objects.filter(is_deleted=False).select_related(
            'customer', 'shop', 'address', 'payment_record'
        ).prefetch_related('items', 'items__product')
        
        if user.is_staff or user.is_superuser or user.role == 'admin':
            return base_qs
        
        if user.role == 'merchant':
            return base_qs.filter(shop__owner=user)
        
        return base_qs.filter(customer=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """
        POST /api/orders/orders/{id}/update_status/
        Body: {"status": "preparing" or "dispatched" or "delivered" or "cancelled"}
        """
        order = self.get_object()
        new_status = request.data.get('status')

        if new_status not in Order.Status.values:
            raise ValidationError(f"Invalid status value. Must be one of: {Order.Status.values}")

        # Permission check: only Merchant owner or Staff can change status
        if not (request.user.is_staff or order.shop.owner == request.user):
            return Response({"error": "You do not own the shop that fulfills this order."}, status=status.HTTP_403_FORBIDDEN)

        # Update status and log transition
        order.status = new_status
        order.timeline_logs[new_status] = timezone.now().isoformat()
        order.save()
        
        # Notify customer
        notify_user(
            user=order.customer,
            title=f"Order {order.id.hex[:8].upper()} Status Updated",
            message=f"Your order from {order.shop.name} is now {new_status.upper()}.",
            notification_type=Notification.Type.ORDER_STATUS
        )

        # Update payment success flag upon delivery
        if new_status == Order.Status.DELIVERED and order.payment_method == Order.PaymentMethod.COD:
            payment = getattr(order, 'payment_record', None)
            if payment:
                payment.status = Payment.Status.SUCCESS
                payment.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    @transaction.atomic
    def cancel(self, request, pk=None):
        """
        POST /api/orders/orders/{id}/cancel/
        Customers can cancel order if 'pending'. Merchants can cancel anytime.
        Restores product inventories!
        """
        order = self.get_object()

        if order.status == Order.Status.CANCELLED:
            raise ValidationError("This order is already cancelled.")

        # Customer cancellation checks
        if order.customer == request.user:
            if order.status != Order.Status.PENDING:
                raise ValidationError("You can only cancel orders that are still pending approval.")
        elif order.shop.owner != request.user and not request.user.is_staff:
            return Response({"error": "You do not have permission to cancel this order."}, status=status.HTTP_403_FORBIDDEN)

        # Process cancellation
        order.status = Order.Status.CANCELLED
        order.timeline_logs['cancelled'] = timezone.now().isoformat()
        order.save()

        # Restore product inventories
        for item in order.items.all():
            if item.product:
                try:
                    inventory = item.product.inventory_record
                    inventory.quantity += item.quantity
                    inventory.save()
                except Inventory.DoesNotExist:
                    pass

        # Update payment as failed/refunded
        payment = getattr(order, 'payment_record', None)
        if payment:
            payment.status = Payment.Status.REFUNDED if payment.status == Payment.Status.SUCCESS else Payment.Status.FAILED
            payment.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify_payment(self, request, pk=None):
        """
        POST /api/orders/orders/{id}/verify_payment/
        Mock verification from the frontend checkout return page.
        """
        order = self.get_object()
        payment = getattr(order, 'payment_record', None)
        if not payment:
            raise ValidationError("No payment record found.")
        
        if payment.status == Payment.Status.PENDING:
            payment.status = Payment.Status.SUCCESS
            payment.gateway_response['verified'] = True
            payment.save()
            
            # Notify Customer and Merchant of Payment Success
            notify_user(
                user=order.customer,
                title="Payment Successful",
                message=f"Your payment of ${order.total} for order {order.id.hex[:8].upper()} was verified successfully.",
                notification_type=Notification.Type.PAYMENT_SUCCESS
            )
            notify_user(
                user=order.shop.owner,
                title="New Paid Order",
                message=f"Order {order.id.hex[:8].upper()} payment of ${order.total} was verified successfully.",
                notification_type=Notification.Type.PAYMENT_SUCCESS
            )
            
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def refund_payment(self, request, pk=None):
        """
        POST /api/orders/orders/{id}/refund_payment/
        """
        order = self.get_object()
        if not (request.user.is_staff or order.shop.owner == request.user):
            return Response({"error": "You do not own the shop that fulfills this order."}, status=status.HTTP_403_FORBIDDEN)
        
        payment = getattr(order, 'payment_record', None)
        if not payment:
            raise ValidationError("No payment record found.")
            
        if payment.status != Payment.Status.SUCCESS:
            raise ValidationError("Only successful payments can be refunded.")
            
        payment.status = Payment.Status.REFUNDED
        payment.gateway_response['refunded'] = True
        payment.save()
        
        # If not cancelled, cancel the order automatically
        if order.status != Order.Status.CANCELLED:
            order.status = Order.Status.CANCELLED
            order.timeline_logs['cancelled'] = timezone.now().isoformat()
            order.save()
            
            for item in order.items.all():
                if item.product:
                    try:
                        inventory = item.product.inventory_record
                        inventory.quantity += item.quantity
                        inventory.save()
                    except Inventory.DoesNotExist:
                        pass
        
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def webhook_receiver(self, request):
        """
        POST /api/orders/orders/webhook_receiver/
        Simulated external async webhook endpoint.
        """
        transaction_id = request.data.get('transaction_id')
        status_update = request.data.get('status')
        
        try:
            payment = Payment.objects.get(transaction_id=transaction_id)
            if status_update == 'success':
                payment.status = Payment.Status.SUCCESS
                # Notify Customer and Merchant of Payment Success
                notify_user(
                    user=payment.order.customer,
                    title="Payment Successful (Webhook)",
                    message=f"Your payment of ${payment.order.total} was verified by the gateway.",
                    notification_type=Notification.Type.PAYMENT_SUCCESS
                )
                notify_user(
                    user=payment.order.shop.owner,
                    title="New Paid Order (Webhook)",
                    message=f"Order {payment.order.id.hex[:8].upper()} payment of ${payment.order.total} was verified by the gateway.",
                    notification_type=Notification.Type.PAYMENT_SUCCESS
                )
            elif status_update == 'failed':
                payment.status = Payment.Status.FAILED
            
            payment.gateway_response['webhook_received'] = True
            payment.save()
            
            return Response({"message": "Webhook processed successfully"}, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=status.HTTP_404_NOT_FOUND)
