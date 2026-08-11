from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.interactions.views import ReviewViewSet, WishlistViewSet, NotificationViewSet

app_name = 'interactions'

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
