from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import os
import uuid
import bcrypt
import jwt
import logging

load_dotenv()

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "kangaroos-delivery-secret-2026")
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Kangaroos Fast Delivery API")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class AuthRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str  # customer, restaurant, rider

class AuthLogin(BaseModel):
    email: str
    password: str

class RestaurantCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    address: str
    cuisine_type: Optional[str] = "General"
    image_url: Optional[str] = None
    prep_time_min: int = 25

class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category: str = "Main"
    image_url: Optional[str] = None
    allergens: Optional[str] = None
    available: bool = True

class OrderCreate(BaseModel):
    restaurant_id: str
    items: List[dict]  # [{menu_item_id, quantity}]
    delivery_address: str
    delivery_notes: Optional[str] = ""
    customer_phone: Optional[str] = None
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    tip: Optional[float] = 0.0

class OrderStatusUpdate(BaseModel):
    status: str

class RiderProfileCreate(BaseModel):
    rider_type: str  # independent, student
    vehicle_type: str = "bicycle"

class RiderOnlineToggle(BaseModel):
    online: bool

# ============== HELPERS ==============

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token required")
    token = auth.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ==============

@api_router.post("/auth/register")
async def register(data: AuthRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "phone": data.phone,
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)

    if data.role == "restaurant":
        restaurant = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "name": data.name + "'s Restaurant",
            "description": "",
            "address": "Dublin, Ireland",
            "cuisine_type": "General",
            "image_url": None,
            "prep_time_min": 25,
            "rating": 4.5,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.restaurants.insert_one(restaurant)

    if data.role == "rider":
        rider_profile = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "rider_type": "independent",
            "vehicle_type": "bicycle",
            "online": False,
            "current_lat": 53.3498,
            "current_lng": -6.2603,
            "weekly_hours_used": 0.0,
            "week_start_date": _get_week_start().isoformat(),
            "hourly_rate": 13.0,
            "total_earnings": 0.0,
            "total_deliveries": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.rider_profiles.insert_one(rider_profile)

    token = create_token(user_id, data.role)
    return {
        "token": token,
        "user": {"id": user_id, "name": data.name, "email": data.email, "role": data.role}
    }

@api_router.post("/auth/login")
async def login(data: AuthLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}

# ============== RESTAURANTS ==============

@api_router.get("/restaurants")
async def list_restaurants():
    restaurants = await db.restaurants.find({"active": True}, {"_id": 0}).to_list(100)
    return restaurants

@api_router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str):
    r = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return r

@api_router.put("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: str, data: RestaurantCreate, user: dict = Depends(get_current_user)):
    result = await db.restaurants.update_one(
        {"id": restaurant_id, "owner_id": user["id"]},
        {"$set": {
            "name": data.name,
            "description": data.description,
            "address": data.address,
            "cuisine_type": data.cuisine_type,
            "image_url": data.image_url,
            "prep_time_min": data.prep_time_min
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant updated"}

# ============== MENU ITEMS ==============

@api_router.get("/restaurants/{restaurant_id}/menu")
async def get_menu(restaurant_id: str):
    items = await db.menu_items.find({"restaurant_id": restaurant_id}, {"_id": 0}).to_list(200)
    return items

@api_router.post("/restaurants/{restaurant_id}/menu")
async def add_menu_item(restaurant_id: str, data: MenuItemCreate, user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": restaurant_id, "owner_id": user["id"]})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Not your restaurant")

    item = {
        "id": str(uuid.uuid4()),
        "restaurant_id": restaurant_id,
        "name": data.name,
        "description": data.description,
        "price": data.price,
        "category": data.category,
        "image_url": data.image_url,
        "allergens": data.allergens,
        "available": data.available,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.menu_items.insert_one(item)
    return {k: v for k, v in item.items() if k != "_id"}

@api_router.put("/menu-items/{item_id}")
async def update_menu_item(item_id: str, data: MenuItemCreate, user: dict = Depends(get_current_user)):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    restaurant = await db.restaurants.find_one({"id": item["restaurant_id"], "owner_id": user["id"]})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Not your restaurant")

    await db.menu_items.update_one(
        {"id": item_id},
        {"$set": data.model_dump()}
    )
    return {"message": "Item updated"}

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    restaurant = await db.restaurants.find_one({"id": item["restaurant_id"], "owner_id": user["id"]})
    if not restaurant:
        raise HTTPException(status_code=403, detail="Not your restaurant")
    await db.menu_items.delete_one({"id": item_id})
    return {"message": "Item deleted"}

# ============== ORDERS ==============

DELIVERY_RATE_PER_KM = 1.50
MIN_DELIVERY_FEE = 6.00
PLATFORM_FEE_PERCENT = 0.15  # 15%

def haversine_km(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in kilometers"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)

@api_router.post("/orders")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"id": data.restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order_items = []
    subtotal = 0.0
    for item_req in data.items:
        menu_item = await db.menu_items.find_one({"id": item_req["menu_item_id"]}, {"_id": 0})
        if not menu_item:
            continue
        qty = item_req.get("quantity", 1)
        line_total = menu_item["price"] * qty
        subtotal += line_total
        order_items.append({
            "menu_item_id": menu_item["id"],
            "name": menu_item["name"],
            "price": menu_item["price"],
            "quantity": qty,
            "line_total": line_total
        })

    if not order_items:
        raise HTTPException(status_code=400, detail="No valid items")

    # Calculate distance-based delivery fee
    restaurant_lat = restaurant.get("lat", 53.3498)
    restaurant_lng = restaurant.get("lng", -6.2603)
    delivery_lat = data.delivery_lat or 53.3458
    delivery_lng = data.delivery_lng or -6.2575
    distance_km = haversine_km(restaurant_lat, restaurant_lng, delivery_lat, delivery_lng)
    if distance_km < 0.5:
        distance_km = round(random.uniform(1.5, 4.0), 1)  # Minimum realistic distance

    delivery_fee = round(MIN_DELIVERY_FEE + distance_km * DELIVERY_RATE_PER_KM, 2)
    tip = round(max(data.tip or 0, 0), 2)
    platform_fee = round(subtotal * PLATFORM_FEE_PERCENT, 2)
    total = round(subtotal + delivery_fee + tip, 2)
    restaurant_amount = round(subtotal - platform_fee, 2)
    rider_amount = round(delivery_fee + tip, 2)

    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    order = {
        "id": order_id,
        "customer_id": user["id"],
        "customer_name": user["name"],
        "restaurant_id": data.restaurant_id,
        "restaurant_name": restaurant["name"],
        "items": order_items,
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "distance_km": distance_km,
        "tip": tip,
        "platform_fee": platform_fee,
        "total": total,
        "restaurant_amount": restaurant_amount,
        "rider_amount": rider_amount,
        "platform_amount": platform_fee,
        "status": "pending",
        "delivery_address": data.delivery_address,
        "delivery_notes": data.delivery_notes,
        "customer_phone": data.customer_phone,
        "delivery_lat": delivery_lat,
        "delivery_lng": delivery_lng,
        "restaurant_lat": restaurant_lat,
        "restaurant_lng": restaurant_lng,
        "rider_id": None,
        "rider_name": None,
        "rider_lat": None,
        "rider_lng": None,
        "pending_at": now,
        "accepted_at": None,
        "preparing_at": None,
        "ready_at": None,
        "picked_up_at": None,
        "delivered_at": None,
        "created_at": now,
        "updated_at": now
    }
    await db.orders.insert_one(order)
    return {k: v for k, v in order.items() if k != "_id"}

@api_router.get("/delivery-fee")
async def calculate_delivery_fee(restaurant_id: str, lat: float = 53.3458, lng: float = -6.2575):
    """Preview delivery fee based on distance"""
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    r_lat = restaurant.get("lat", 53.3498)
    r_lng = restaurant.get("lng", -6.2603)
    distance_km = haversine_km(r_lat, r_lng, lat, lng)
    if distance_km < 0.5:
        distance_km = round(random.uniform(1.5, 4.0), 1)
    fee = round(MIN_DELIVERY_FEE + distance_km * DELIVERY_RATE_PER_KM, 2)
    return {"distance_km": distance_km, "delivery_fee": fee, "rate_per_km": DELIVERY_RATE_PER_KM, "base_fee": MIN_DELIVERY_FEE}

@api_router.get("/orders")
async def get_my_orders(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] == "customer":
        query["customer_id"] = user["id"]
    elif user["role"] == "restaurant":
        restaurant = await db.restaurants.find_one({"owner_id": user["id"]}, {"_id": 0})
        if restaurant:
            query["restaurant_id"] = restaurant["id"]
    elif user["role"] == "rider":
        rider = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        if rider:
            query["rider_id"] = rider["id"]

    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, user: dict = Depends(get_current_user)):
    valid_statuses = ["accepted", "preparing", "ready", "picked_up", "delivered", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    now = datetime.now(timezone.utc).isoformat()
    update = {"status": data.status, "updated_at": now}
    update[f"{data.status}_at"] = now

    if data.status == "delivered" and order.get("rider_id"):
        rider = await db.rider_profiles.find_one({"id": order["rider_id"]}, {"_id": 0})
        if rider:
            new_earnings = rider.get("total_earnings", 0) + order.get("rider_amount", MIN_DELIVERY_FEE)
            new_deliveries = rider.get("total_deliveries", 0) + 1
            await db.rider_profiles.update_one(
                {"id": rider["id"]},
                {"$set": {"total_earnings": round(new_earnings, 2), "total_deliveries": new_deliveries}}
            )
            await db.payments.insert_one({
                "id": str(uuid.uuid4()),
                "order_id": order_id,
                "total_amount": order["total"],
                "restaurant_amount": order.get("restaurant_amount", 0),
                "rider_amount": order.get("rider_amount", MIN_DELIVERY_FEE),
                "platform_amount": order.get("platform_amount", 0),
                "rider_id": rider["id"],
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    await db.orders.update_one({"id": order_id}, {"$set": update})

    # Create notifications for online riders when order is ready for pickup
    if data.status == "ready":
        online_riders = await db.rider_profiles.find({"online": True}, {"_id": 0}).to_list(50)
        for rider in online_riders:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "rider_id": rider["id"],
                "user_id": rider["user_id"],
                "type": "new_order",
                "order_id": order_id,
                "title": "New order available!",
                "message": f"{order['restaurant_name']} - {len(order.get('items', []))} items - EUR {order.get('rider_amount', MIN_DELIVERY_FEE):.2f} delivery fee",
                "delivery_address": order.get("delivery_address", ""),
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    return {"message": f"Order status updated to {data.status}"}

# ============== NOTIFICATIONS ==============

@api_router.get("/rider/notifications")
async def get_rider_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(30)
    return notifications

@api_router.get("/rider/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}

@api_router.put("/rider/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.put("/rider/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All marked as read"}

def _get_week_start():
    now = datetime.now(timezone.utc)
    days_since_friday = (now.weekday() - 4) % 7
    return (now - timedelta(days=days_since_friday)).replace(hour=0, minute=0, second=0, microsecond=0)

@api_router.get("/rider/profile")
async def get_rider_profile(user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    week_start = _get_week_start()
    if profile.get("week_start_date") != week_start.isoformat():
        await db.rider_profiles.update_one(
            {"id": profile["id"]},
            {"$set": {"weekly_hours_used": 0.0, "week_start_date": week_start.isoformat()}}
        )
        profile["weekly_hours_used"] = 0.0

    return profile

@api_router.put("/rider/profile")
async def update_rider_profile(data: RiderProfileCreate, user: dict = Depends(get_current_user)):
    result = await db.rider_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {"rider_type": data.rider_type, "vehicle_type": data.vehicle_type}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile updated"}

@api_router.put("/rider/online")
async def toggle_rider_online(data: RiderOnlineToggle, user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.get("rider_type") == "student" and data.online:
        if profile.get("weekly_hours_used", 0) >= 20:
            raise HTTPException(status_code=403, detail="Weekly 20h limit reached. Resets on Friday.")
        now = datetime.now(timezone.utc)
        if now.weekday() not in [4, 5, 6]:  # Fri=4, Sat=5, Sun=6
            raise HTTPException(status_code=403, detail="Student riders can only work Fri-Sun")

    update = {"online": data.online}
    if data.online:
        update["last_online_at"] = datetime.now(timezone.utc).isoformat()
    else:
        if profile.get("last_online_at"):
            start = datetime.fromisoformat(profile["last_online_at"])
            hours = (datetime.now(timezone.utc) - start).total_seconds() / 3600
            new_hours = round(profile.get("weekly_hours_used", 0) + hours, 2)
            update["weekly_hours_used"] = new_hours

    await db.rider_profiles.update_one({"user_id": user["id"]}, {"$set": update})
    return {"message": "Online status updated", "online": data.online}

@api_router.get("/rider/available-orders")
async def get_available_orders(user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile or not profile.get("online"):
        return []

    orders = await db.orders.find(
        {"status": "ready", "rider_id": None},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return orders

@api_router.post("/rider/accept/{order_id}")
async def accept_order(order_id: str, user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    active_count = await db.orders.count_documents({
        "rider_id": profile["id"],
        "status": {"$in": ["picked_up"]}
    })
    if active_count >= 3:
        raise HTTPException(status_code=400, detail="Max 3 active deliveries")

    order = await db.orders.find_one({"id": order_id, "rider_id": None}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not available")

    now = datetime.now(timezone.utc).isoformat()
    # Set rider initial position at restaurant location
    restaurant_lat = order.get("restaurant_lat", 53.3498)
    restaurant_lng = order.get("restaurant_lng", -6.2603)
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "rider_id": profile["id"],
            "rider_name": user["name"],
            "status": "picked_up",
            "picked_up_at": now,
            "rider_lat": restaurant_lat,
            "rider_lng": restaurant_lng,
            "updated_at": now
        }}
    )
    return {"message": "Order accepted", "order_id": order_id}

@api_router.get("/orders/{order_id}/qr-code")
async def get_order_qr_code(order_id: str, user: dict = Depends(get_current_user)):
    """Get QR code data for order delivery confirmation"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only show QR when order is picked up (being delivered)
    if order.get("status") != "picked_up":
        raise HTTPException(status_code=400, detail="QR code only available when order is being delivered")
    
    # Generate QR data with order verification
    qr_data = f"KANG-DELIVERY:{order_id}"
    return {"qr_data": qr_data, "order_id": order_id}

class QRValidation(BaseModel):
    qr_data: str

@api_router.post("/rider/validate-qr")
async def validate_qr_and_complete(data: QRValidation, user: dict = Depends(get_current_user)):
    """Rider scans QR code to complete delivery and release payment"""
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    
    # Parse QR data
    if not data.qr_data.startswith("KANG-DELIVERY:"):
        raise HTTPException(status_code=400, detail="Invalid QR code")
    
    order_id = data.qr_data.replace("KANG-DELIVERY:", "")
    
    order = await db.orders.find_one({"id": order_id, "rider_id": profile["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")
    
    if order.get("status") != "picked_up":
        raise HTTPException(status_code=400, detail="Order is not in delivery status")
    
    # Complete delivery and release payment
    rider_earnings = order.get("rider_amount", MIN_DELIVERY_FEE)
    new_total = round(profile.get("total_earnings", 0) + rider_earnings, 2)
    new_deliveries = profile.get("total_deliveries", 0) + 1

    now_complete = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "delivered", "delivered_at": now_complete, "updated_at": now_complete}}
    )
    await db.rider_profiles.update_one(
        {"id": profile["id"]},
        {"$set": {"total_earnings": new_total, "total_deliveries": new_deliveries}}
    )
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "total_amount": order["total"],
        "restaurant_amount": order.get("restaurant_amount", 0),
        "rider_amount": rider_earnings,
        "platform_amount": order.get("platform_amount", 0),
        "rider_id": profile["id"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "success": True,
        "message": f"Delivery confirmed! Payment released: EUR {rider_earnings:.2f}",
        "earnings": rider_earnings,
        "total_earnings": new_total,
        "order_id": order_id
    }

@api_router.post("/rider/complete/{order_id}")
async def complete_delivery(order_id: str, user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    order = await db.orders.find_one({"id": order_id, "rider_id": profile["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    rider_earnings = order.get("rider_amount", MIN_DELIVERY_FEE)
    new_total = round(profile.get("total_earnings", 0) + rider_earnings, 2)
    new_deliveries = profile.get("total_deliveries", 0) + 1

    now_complete = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "delivered", "delivered_at": now_complete, "updated_at": now_complete}}
    )
    await db.rider_profiles.update_one(
        {"id": profile["id"]},
        {"$set": {"total_earnings": new_total, "total_deliveries": new_deliveries}}
    )
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "total_amount": order["total"],
        "restaurant_amount": order.get("restaurant_amount", 0),
        "rider_amount": rider_earnings,
        "platform_amount": order.get("platform_amount", 0),
        "rider_id": profile["id"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "message": f"Delivery completed! You earned EUR {rider_earnings}",
        "earnings": rider_earnings,
        "total_earnings": new_total
    }

@api_router.get("/rider/earnings")
async def get_rider_earnings(user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    payments = await db.payments.find(
        {"rider_id": profile["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {
        "total_earnings": profile.get("total_earnings", 0),
        "total_deliveries": profile.get("total_deliveries", 0),
        "weekly_hours": profile.get("weekly_hours_used", 0),
        "rider_type": profile.get("rider_type", "independent"),
        "recent_payments": payments[:20]
    }

@api_router.get("/rider/active-orders")
async def get_rider_active_orders(user: dict = Depends(get_current_user)):
    profile = await db.rider_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        return []
    orders = await db.orders.find(
        {"rider_id": profile["id"], "status": {"$in": ["picked_up"]}},
        {"_id": 0}
    ).to_list(10)
    return orders

# ============== RIDER LOCATION (SIMULATED) ==============

import random
import math

class RiderLocationUpdate(BaseModel):
    order_id: str
    lat: float
    lng: float

@api_router.put("/rider/location")
async def update_rider_location(data: RiderLocationUpdate, user: dict = Depends(get_current_user)):
    """Rider updates their GPS position for a specific order"""
    await db.orders.update_one(
        {"id": data.order_id},
        {"$set": {"rider_lat": data.lat, "rider_lng": data.lng, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Location updated"}

@api_router.get("/orders/{order_id}/tracking")
async def get_order_tracking(order_id: str):
    """Get order with simulated rider movement toward delivery address"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Simulate rider moving toward delivery address
    if order.get("status") == "picked_up" and order.get("picked_up_at"):
        pickup_time = datetime.fromisoformat(order["picked_up_at"])
        elapsed = (datetime.now(timezone.utc) - pickup_time).total_seconds()
        total_delivery_time = 600  # 10 min delivery simulation

        progress = min(elapsed / total_delivery_time, 0.95)

        start_lat = order.get("restaurant_lat", 53.3498)
        start_lng = order.get("restaurant_lng", -6.2603)
        end_lat = order.get("delivery_lat", 53.3458)
        end_lng = order.get("delivery_lng", -6.2575)

        # Interpolate position with slight random offset for realism
        current_lat = start_lat + (end_lat - start_lat) * progress + random.uniform(-0.0003, 0.0003)
        current_lng = start_lng + (end_lng - start_lng) * progress + random.uniform(-0.0003, 0.0003)

        order["rider_lat"] = round(current_lat, 7)
        order["rider_lng"] = round(current_lng, 7)
        order["delivery_progress"] = round(progress * 100, 1)

    return order

# ============== RESTAURANT DASHBOARD ==============

@api_router.get("/restaurant/my")
async def get_my_restaurant(user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="No restaurant found")
    return restaurant

@api_router.get("/restaurant/orders")
async def get_restaurant_orders(user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not restaurant:
        return []
    orders = await db.orders.find(
        {"restaurant_id": restaurant["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/restaurant/stats")
async def get_restaurant_stats(user: dict = Depends(get_current_user)):
    restaurant = await db.restaurants.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not restaurant:
        return {}

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total_orders = await db.orders.count_documents({"restaurant_id": restaurant["id"]})
    today_orders = await db.orders.count_documents({
        "restaurant_id": restaurant["id"],
        "created_at": {"$gte": today.isoformat()}
    })
    delivered = await db.orders.count_documents({
        "restaurant_id": restaurant["id"], "status": "delivered"
    })

    pipeline = [
        {"$match": {"restaurant_id": restaurant["id"], "status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$restaurant_amount"}}}
    ]
    agg = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = agg[0]["total"] if agg else 0

    return {
        "total_orders": total_orders,
        "today_orders": today_orders,
        "delivered": delivered,
        "total_revenue": round(total_revenue, 2)
    }

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_data():
    existing = await db.restaurants.find_one({"name": "Crazy Potato"})
    if existing:
        await db.restaurants.update_one({"name": "Crazy Potato"}, {"$set": {"image_url": "/crazy-potato-food.jpg", "lat": 53.3568, "lng": -6.2650, "address": "83 Dorset Street Lower, Phibsborough, Dublin 1, D01 E4C2"}})
        await db.restaurants.update_one({"name": "Dublin Burger Co."}, {"$set": {"lat": 53.3455, "lng": -6.2643, "address": "Temple Bar, Dublin 2"}})
        await db.restaurants.update_one({"name": "Sushi Garden"}, {"$set": {"lat": 53.3415, "lng": -6.2594, "address": "Grafton Street, Dublin 2"}})
        return {"message": "Data already seeded"}

    restaurant_id = str(uuid.uuid4())
    restaurant = {
        "id": restaurant_id,
        "owner_id": "seed-owner",
        "name": "Crazy Potato",
        "description": "The Best Baked Potato in Dublin! Build your own spud with amazing toppings.",
        "address": "83 Dorset Street Lower, Phibsborough, Dublin 1, D01 E4C2",
        "cuisine_type": "Baked Potato",
        "image_url": "/crazy-potato-food.jpg",
        "prep_time_min": 20,
        "rating": 4.8,
        "active": True,
        "lat": 53.3568,
        "lng": -6.2650,
        "contact": {
            "instagram": "@crazypotato.ie",
            "whatsapp": "+353 89 958 3638",
            "facebook": "crazypotatoie",
            "instagram_url": "https://instagram.com/crazypotato.ie",
            "facebook_url": "https://facebook.com/crazypotatoie"
        },
        "slogan": "The Best Baked Potato",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    menu_items = [
        {"name": "Chicken Curry", "description": "Baked potato with butter seasoning, two cheeses, chicken curry and crispy onions", "price": 12.50, "category": "Specialty Potatoes", "allergens": "Milk, Gluten"},
        {"name": "Chicken Stroganoff", "description": "Baked potato with butter seasoning, three cheeses, chicken stroganoff and shoestring potatoes", "price": 12.50, "category": "Specialty Potatoes", "allergens": "Milk, Gluten"},
        {"name": "Crazy Beef", "description": "Baked potato with butter seasoning, shredded beef, three cheeses, cream cheese and crispy onions", "price": 12.99, "category": "Specialty Potatoes", "allergens": "Milk, Gluten"},
        {"name": "BBQ Pork", "description": "Baked potato with butter seasoning, diced pork, three cheeses and crispy onions", "price": 10.50, "category": "Specialty Potatoes", "allergens": "Milk, Gluten"},
        {"name": "Calabrese and Cheese", "description": "Baked potato with butter seasoning, sausage, three cheeses, coriander and spring onion", "price": 10.99, "category": "Specialty Potatoes", "allergens": "Milk"},
        {"name": "Broccoli and Bacon", "description": "Baked potato with butter seasoning, broccoli with bacon, mozzarella and cream cheese", "price": 9.99, "category": "Specialty Potatoes", "allergens": "Milk"},
        {"name": "Chili Con Carne", "description": "Baked potato with butter seasoning, chili con carne, three cheeses, coriander and spring onion", "price": 10.99, "category": "Specialty Potatoes", "allergens": "Milk"},
        {"name": "Beans and Cheese", "description": "Baked potato with butter seasoning, three cheeses, cooked beans, crispy onions and house sauce", "price": 7.99, "category": "Specialty Potatoes", "allergens": "Milk, Gluten"},
        {"name": "Beans, Tuna and Coleslaw", "description": "Baked potato with butter seasoning, two cheeses, beans, tuna, coleslaw, crispy onions and house sauce", "price": 9.99, "category": "Specialty Potatoes", "allergens": "Fish, Milk, Eggs"},
        {"name": "Chickpea Stroganoff", "description": "Baked potato with chickpeas, cashew nuts, onion and vegan cheese", "price": 12.50, "category": "Vegan Potatoes", "allergens": "Nuts"},
        {"name": "Vegan Moqueca", "description": "Baked potato with onion, peppers, tomato, coconut milk and crunchy nut farofa", "price": 12.50, "category": "Vegan Potatoes", "allergens": "Nuts"},
        {"name": "Create Your Own Spud", "description": "Build your own baked potato with your 3 favourite toppings! Only EUR 14.99", "price": 14.99, "category": "Create Your Own", "allergens": None},
        {"name": "Coleslaw", "description": "Extra topping", "price": 1.00, "category": "Extras", "allergens": "Milk, Eggs"},
        {"name": "Cream Cheese", "description": "Extra topping", "price": 2.00, "category": "Extras", "allergens": "Milk"},
        {"name": "Mushrooms", "description": "Extra topping", "price": 1.00, "category": "Extras", "allergens": None},
        {"name": "Crispy Onions", "description": "Extra topping", "price": 0.50, "category": "Extras", "allergens": "Gluten"},
        {"name": "Shoestring Potatoes", "description": "Extra topping", "price": 2.00, "category": "Extras", "allergens": None},
        {"name": "Bacon", "description": "Extra topping", "price": 2.00, "category": "Extras", "allergens": None},
        {"name": "Tuna", "description": "Extra topping", "price": 1.50, "category": "Extras", "allergens": "Fish"},
        {"name": "Coke", "description": "", "price": 2.99, "category": "Drinks", "allergens": None},
        {"name": "Coke Zero", "description": "", "price": 2.99, "category": "Drinks", "allergens": None},
        {"name": "Fanta", "description": "", "price": 2.99, "category": "Drinks", "allergens": None},
        {"name": "7 Up", "description": "", "price": 2.99, "category": "Drinks", "allergens": None},
        {"name": "Water", "description": "", "price": 2.99, "category": "Drinks", "allergens": None},
    ]

    await db.restaurants.insert_one(restaurant)

    for item in menu_items:
        doc = {
            "id": str(uuid.uuid4()),
            "restaurant_id": restaurant_id,
            "name": item["name"],
            "description": item["description"],
            "price": item["price"],
            "category": item["category"],
            "image_url": None,
            "allergens": item["allergens"],
            "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.menu_items.insert_one(doc)

    r2_id = str(uuid.uuid4())
    await db.restaurants.insert_one({
        "id": r2_id, "owner_id": "seed-owner-2",
        "name": "Dublin Burger Co.", "description": "Premium burgers made with Irish beef",
        "address": "Temple Bar, Dublin 2", "cuisine_type": "Burgers",
        "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
        "prep_time_min": 15, "rating": 4.6, "active": True,
        "lat": 53.3455, "lng": -6.2643,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    for item in [
        {"name": "Classic Burger", "description": "Irish beef, cheddar, lettuce, tomato", "price": 11.99, "category": "Burgers"},
        {"name": "Bacon Cheese Burger", "description": "Irish beef, bacon, double cheddar", "price": 13.99, "category": "Burgers"},
        {"name": "Veggie Burger", "description": "Plant-based patty, avocado, sriracha mayo", "price": 12.50, "category": "Burgers"},
        {"name": "Chicken Wings (8pc)", "description": "BBQ or Buffalo sauce", "price": 9.99, "category": "Sides"},
        {"name": "Fries", "description": "Crispy seasoned fries", "price": 4.99, "category": "Sides"},
    ]:
        await db.menu_items.insert_one({
            "id": str(uuid.uuid4()), "restaurant_id": r2_id,
            "name": item["name"], "description": item["description"],
            "price": item["price"], "category": item["category"],
            "image_url": None, "allergens": None, "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    r3_id = str(uuid.uuid4())
    await db.restaurants.insert_one({
        "id": r3_id, "owner_id": "seed-owner-3",
        "name": "Sushi Garden", "description": "Fresh Japanese sushi and ramen",
        "address": "Grafton Street, Dublin 2", "cuisine_type": "Japanese",
        "image_url": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
        "prep_time_min": 25, "rating": 4.7, "active": True,
        "lat": 53.3415, "lng": -6.2594,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    for item in [
        {"name": "Salmon Nigiri (6pc)", "description": "Fresh Atlantic salmon", "price": 12.99, "category": "Sushi"},
        {"name": "California Roll (8pc)", "description": "Crab, avocado, cucumber", "price": 10.99, "category": "Sushi"},
        {"name": "Tonkotsu Ramen", "description": "Rich pork broth, chashu, egg", "price": 14.99, "category": "Ramen"},
        {"name": "Edamame", "description": "Steamed with sea salt", "price": 5.99, "category": "Starters"},
        {"name": "Miso Soup", "description": "Traditional dashi broth", "price": 4.50, "category": "Starters"},
    ]:
        await db.menu_items.insert_one({
            "id": str(uuid.uuid4()), "restaurant_id": r3_id,
            "name": item["name"], "description": item["description"],
            "price": item["price"], "category": item["category"],
            "image_url": None, "allergens": None, "available": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return {"message": "Seed data created", "restaurants": 3}


RIDER_RADIUS_KM = 5.0  # Radius in km for rider to see restaurants

@api_router.get("/rider/nearby-restaurants")
async def get_nearby_restaurants(user: dict = Depends(get_current_user)):
    """Get all restaurants with locations for the rider map"""
    restaurants = await db.restaurants.find({"active": True}, {"_id": 0}).to_list(100)
    result = []
    for r in restaurants:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "address": r.get("address", ""),
            "cuisine_type": r.get("cuisine_type", ""),
            "lat": r.get("lat", 53.3498),
            "lng": r.get("lng", -6.2603),
            "rating": r.get("rating", 4.5),
            "image_url": r.get("image_url"),
        })
    return {"restaurants": result, "radius_km": RIDER_RADIUS_KM}

# ============== HEALTH ==============

@api_router.get("/health")
async def health():
    return {"status": "ok", "app": "Kangaroos Fast Delivery API"}

app.include_router(api_router)

@app.on_event("startup")
async def startup():
    logger.info("Kangaroos Fast Delivery API started!")
