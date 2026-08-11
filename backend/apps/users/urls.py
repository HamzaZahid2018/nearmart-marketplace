from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import (
    RegisterView,
    LoginView,
    UserProfileView,
    AddressViewSet,
    UserViewSet
)

app_name = 'users'

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
