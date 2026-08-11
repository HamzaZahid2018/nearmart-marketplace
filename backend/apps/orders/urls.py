from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.orders.views import CartViewSet, OrderViewSet

app_name = 'orders'

router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
