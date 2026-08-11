from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Mountpoints
    path('api/v1/users/', include('apps.users.urls', namespace='users')),
    path('api/v1/shops/', include('apps.shops.urls', namespace='shops')),
    path('api/v1/products/', include('apps.products.urls', namespace='products')),
    path('api/v1/orders/', include('apps.orders.urls', namespace='orders')),
    path('api/v1/promotions/', include('apps.promotions.urls', namespace='promotions')),
    path('api/v1/interactions/', include('apps.interactions.urls', namespace='interactions')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
