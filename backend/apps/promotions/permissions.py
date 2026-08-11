from rest_framework import permissions


class IsAdminOrCreateOnly(permissions.BasePermission):
    """
    Coupons can be read by anyone, but modified/created only by admins.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)
