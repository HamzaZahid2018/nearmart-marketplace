import os
import sys
import json
import django
import uuid

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nearmart_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.users.models import Address
from apps.shops.models import Shop
from apps.products.models import Category, Product, ProductImage, Inventory
from apps.promotions.models import Coupon

User = get_user_model()

def make_uuid(string_id):
    # Generates a stable UUID from a standard string ID like 'shop-1'
    return uuid.uuid5(uuid.NAMESPACE_DNS, string_id)

def seed():
    # Load data
    db_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database.json')
    data = {}
    if os.path.exists(db_file_path):
        with open(db_file_path, 'r') as f:
            data = json.load(f)
    else:
        print(f"Notice: {db_file_path} not found. Seeding with default sample shops and products.")
        data = {
            "shops": [
                {
                    "id": "shop-1",
                    "name": "Sourdough & Co.",
                    "description": "Artisanal wild yeast sourdough batards, brioche & croissants baked fresh daily.",
                    "rating": 4.9,
                    "reviewCount": 128,
                    "logo": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300",
                    "category": "Breads & Pastries",
                    "distance": "0.4 miles",
                    "approved": True,
                    "verified": True,
                    "ownerName": "Clara Jenkins",
                    "revenue": 14820.00
                },
                {
                    "id": "shop-2",
                    "name": "Green Life Organic Market",
                    "description": "100% certified organic farm vegetables, heirloom tomatoes, fresh herbs & microgreens.",
                    "rating": 4.8,
                    "reviewCount": 94,
                    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300",
                    "category": "Organic Produce",
                    "distance": "0.8 miles",
                    "approved": True,
                    "verified": True,
                    "ownerName": "Marcus Solis",
                    "revenue": 9450.00
                }
            ],
            "products": [
                {
                    "id": "prod-1",
                    "shopId": "shop-1",
                    "name": "San Francisco Wild Sourdough Batard",
                    "description": "Naturally fermented for 36 hours with a thick crunchy crust and airy open crumb structure.",
                    "price": 7.50,
                    "rating": 4.9,
                    "reviewCount": 84,
                    "image": "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&q=80&w=600",
                    "category": "Breads & Pastries",
                    "inventory": 24,
                    "salesCount": 42
                },
                {
                    "id": "prod-2",
                    "shopId": "shop-2",
                    "name": "Heirloom Tomato Harvest Box",
                    "description": "Assorted sun-ripened organic heirloom tomatoes grown without synthetic pesticides.",
                    "price": 12.00,
                    "rating": 4.8,
                    "reviewCount": 38,
                    "image": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
                    "category": "Organic Produce",
                    "inventory": 15,
                    "salesCount": 26
                }
            ],
            "coupons": [
                {
                    "id": "coup-1",
                    "code": "NEARMART5",
                    "discountPercent": 15,
                    "description": "15% off your first neighborhood express order over $20",
                    "minSpend": 20.00,
                    "active": True
                }
            ]
        }

    print("Seeding database...")

    # 1. Create Default Users
    users_info = [
        {"username": "customer", "email": "patron@nearmart.com", "role": "customer", "first_name": "Valued", "last_name": "Patron", "phone": "(555) 019-2831"},
        {"username": "merchant", "email": "merchant@nearmart.com", "role": "merchant", "first_name": "Shop", "last_name": "Merchant", "phone": "(555) 555-5555"},
        {"username": "clara", "email": "clara@sourdoughco.com", "role": "merchant", "first_name": "Clara", "last_name": "Jenkins", "phone": "(555) 321-4820"},
        {"username": "marcus", "email": "marcus@greenlife.com", "role": "merchant", "first_name": "Marcus", "last_name": "Solis", "phone": "(555) 762-9810"},
        {"username": "nico", "email": "nico@thedailygrind.co", "role": "merchant", "first_name": "Nico", "last_name": "Sterling", "phone": "(555) 893-1024"},
        {"username": "aveline", "email": "aveline@floraclay.com", "role": "merchant", "first_name": "Aveline", "last_name": "Moreau", "phone": "(555) 451-9988"},
        {"username": "silas", "email": "silas@pantryguild.com", "role": "merchant", "first_name": "Silas", "last_name": "Vance", "phone": "(555) 234-8761"},
        {"username": "admin", "email": "admin@nearmart.com", "role": "admin", "first_name": "Platform", "last_name": "Admin", "phone": "(555) 999-9999", "is_staff": True, "is_superuser": True}
    ]

    created_users = {}
    for u_info in users_info:
        is_staff = u_info.get("is_staff", False)
        is_superuser = u_info.get("is_superuser", False)
        user, created = User.objects.get_or_create(
            username=u_info["username"],
            defaults={
                "email": u_info["email"],
                "role": u_info["role"],
                "first_name": u_info["first_name"],
                "last_name": u_info["last_name"],
                "phone_number": u_info["phone"],
                "is_staff": is_staff,
                "is_superuser": is_superuser
            }
        )
        user.set_password("NearMartPass2026!")
        user.save()
        created_users[u_info["username"]] = user

    # Create default address for customer
    customer_user = created_users["customer"]
    Address.objects.get_or_create(
        user=customer_user,
        title="Home",
        defaults={
            "street_address": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "IL",
            "zip_code": "62704",
            "is_default": True
        }
    )

    # 2. Create Shops
    shops_map = {}
    for s_data in data.get("shops", []):
        owner_username = "clara"
        if "Marcus" in s_data.get("ownerName", ""):
            owner_username = "marcus"
        elif "Nico" in s_data.get("ownerName", ""):
            owner_username = "nico"
        elif "Aveline" in s_data.get("ownerName", ""):
            owner_username = "aveline"
        elif "Silas" in s_data.get("ownerName", ""):
            owner_username = "silas"

        owner_user = created_users[owner_username]
        shop_uuid = make_uuid(s_data["id"])
        
        shop, created = Shop.objects.get_or_create(
            id=shop_uuid,
            defaults={
                "owner": owner_user,
                "name": s_data["name"],
                "description": s_data["description"],
                "category": s_data["category"],
                "image": s_data["logo"],
                "rating": s_data["rating"],
                "review_count": s_data["reviewCount"],
                "approved": s_data["approved"],
                "verified": s_data["verified"],
                "revenue": s_data["revenue"],
                "delivery_range_km": float(s_data.get("distance", "5.0").split()[0]) if "miles" in s_data.get("distance", "") else 5.0,
                "latitude": 40.7128,
                "longitude": -74.0060,
            }
        )
        shops_map[s_data["id"]] = shop

    # 3. Create Categories
    categories_set = set(p_data["category"] for p_data in data.get("products", []))
    categories_map = {}
    for cat_name in categories_set:
        cat, created = Category.objects.get_or_create(
            name=cat_name,
            defaults={
                "description": f"Quality seasonal {cat_name.lower()} items."
            }
        )
        categories_map[cat_name] = cat

    # 4. Create Products and Inventory
    for p_data in data.get("products", []):
        shop = shops_map.get(p_data["shopId"])
        cat = categories_map.get(p_data["category"])
        if not shop or not cat:
            continue
        
        product_uuid = make_uuid(p_data["id"])
        product, created = Product.objects.get_or_create(
            id=product_uuid,
            defaults={
                "shop": shop,
                "category": cat,
                "name": p_data["name"],
                "description": p_data["description"],
                "price": p_data["price"],
                "unit": "unit",
                "rating": p_data["rating"],
                "review_count": p_data["reviewCount"],
                "sales_count": p_data["salesCount"],
                "status": Product.Status.ACTIVE
            }
        )
        
        # Primary Image
        ProductImage.objects.get_or_create(
            product=product,
            image_url=p_data["image"],
            defaults={"is_primary": True}
        )
        
        # Inventory
        Inventory.objects.get_or_create(
            product=product,
            defaults={
                "quantity": p_data["inventory"],
                "low_stock_threshold": 5
            }
        )

    # 5. Create Coupons
    for c_data in data.get("coupons", []):
        Coupon.objects.get_or_create(
            code=c_data["code"],
            defaults={
                "description": c_data["description"],
                "discount_percent": c_data["discountPercent"],
                "min_spend": c_data["minSpend"],
                "active": c_data["active"],
                "start_date": "2026-01-01",
                "end_date": "2027-12-31"
            }
        )

    print("Database seeded successfully with initial data!")

if __name__ == '__main__':
    seed()
