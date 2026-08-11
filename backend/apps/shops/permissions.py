from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsShopOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of a shop or admins to edit/delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) allowed for everyone if shop is approved
        if request.method in permissions.SAFE_METHODS:
            return obj.approved or (request.user and request.user.is_authenticated and (obj.owner == request.user or request.user.is_staff))
            
        # Write operations require being authenticated and being the shop owner or admin
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (obj.owner == request.user or request.user.is_staff)
        )
