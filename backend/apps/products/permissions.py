from rest_framework import permissions


class IsProductOwnerOrAdmin(permissions.BasePermission):
    """
    Checks if the user owns the shop that lists this product, or is an admin.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (obj.shop.owner == request.user or request.user.is_staff)
        )


class IsCategoryAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access for anyone, but write access is exclusive to admins.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)
