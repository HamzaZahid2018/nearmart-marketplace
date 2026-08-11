from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsMerchant(permissions.BasePermission):
    """
    Allows access only to verified merchant users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.MERCHANT)


class IsCustomer(permissions.BasePermission):
    """
    Allows access only to customer users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.CUSTOMER)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows object access only to the owner of the object or admins.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_staff or request.user.is_superuser:
            return True
            
        # Standard user owns the object check
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'customer'):
            return obj.customer == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
            
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read access to anyone, write access to Administrators/Staff.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)
