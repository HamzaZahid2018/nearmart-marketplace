from rest_framework import permissions


class IsReviewAuthorOrAdmin(permissions.BasePermission):
    """
    Allows review viewing to anyone, but edits/deletions only to the author or admins.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and (obj.user == request.user or request.user.is_staff))


class IsInteractionOwner(permissions.BasePermission):
    """
    Allows access only if the item belongs to the authenticated owner.
    """
    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user.is_authenticated and obj.user == request.user)
