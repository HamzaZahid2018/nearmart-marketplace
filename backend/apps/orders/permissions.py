from rest_framework import permissions


class IsCartOwner(permissions.BasePermission):
    """
    Restricts cart access to the owner of the cart.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)


class IsOrderParticipantOrAdmin(permissions.BasePermission):
    """
    An Order can be accessed by:
    - The customer who placed it.
    - The owner of the shop that fulfills it.
    - Administrators.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff:
            return True

        # Check if user is the customer who placed the order
        if obj.customer == request.user:
            return True

        # Check if user is the merchant owner of the shop
        if obj.shop.owner == request.user:
            return True

        return False
