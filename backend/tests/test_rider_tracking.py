"""
Rider Location Tracking Tests
Tests for: PUT /api/rider/location, GET /api/orders/{order_id}/tracking
Full order lifecycle with GPS tracking
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "demo_cliente@test.com"
CUSTOMER_PASSWORD = "test123"
RIDER_EMAIL = "demo_rider@test.com"
RIDER_PASSWORD = "test123"


class TestRiderLocationEndpoints:
    """Tests for rider location and tracking endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test users and get tokens"""
        # Seed data first
        requests.post(f"{BASE_URL}/api/seed")
        
        # Register/login customer
        customer_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Customer",
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD,
            "role": "customer"
        })
        if customer_reg.status_code == 400:  # Already exists
            customer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": CUSTOMER_EMAIL,
                "password": CUSTOMER_PASSWORD
            })
            self.customer_token = customer_login.json().get("token")
        else:
            self.customer_token = customer_reg.json().get("token")
        
        # Register/login rider
        rider_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Rider",
            "email": RIDER_EMAIL,
            "password": RIDER_PASSWORD,
            "role": "rider"
        })
        if rider_reg.status_code == 400:  # Already exists
            rider_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": RIDER_EMAIL,
                "password": RIDER_PASSWORD
            })
            self.rider_token = rider_login.json().get("token")
        else:
            self.rider_token = rider_reg.json().get("token")
        
        self.customer_headers = {"Authorization": f"Bearer {self.customer_token}"}
        self.rider_headers = {"Authorization": f"Bearer {self.rider_token}"}
    
    def test_put_rider_location_updates_order(self):
        """Test PUT /api/rider/location updates order with GPS coordinates"""
        # 1. Get a restaurant and menu item
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = restaurants[0]
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        # 2. Create order as customer
        order_response = requests.post(f"{BASE_URL}/api/orders", json={
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "123 Test Street, Dublin",
            "delivery_lat": 53.3458,
            "delivery_lng": -6.2575
        }, headers=self.customer_headers)
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        order = order_response.json()
        order_id = order["id"]
        print(f"✓ Created order: {order_id}")
        
        # 3. Set order status to 'ready' (simulating restaurant)
        status_response = requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "ready"}, headers=self.customer_headers)
        assert status_response.status_code == 200, f"Failed to set ready: {status_response.text}"
        print("✓ Order set to ready")
        
        # 4. Rider goes online
        online_response = requests.put(f"{BASE_URL}/api/rider/online", 
            json={"online": True}, headers=self.rider_headers)
        assert online_response.status_code == 200
        print("✓ Rider is online")
        
        # 5. Rider accepts order (sets status to picked_up)
        accept_response = requests.post(f"{BASE_URL}/api/rider/accept/{order_id}", 
            headers=self.rider_headers)
        assert accept_response.status_code == 200, f"Failed to accept: {accept_response.text}"
        print("✓ Rider accepted order")
        
        # 6. Rider updates location
        test_lat = 53.3520
        test_lng = -6.2610
        location_response = requests.put(f"{BASE_URL}/api/rider/location", json={
            "order_id": order_id,
            "lat": test_lat,
            "lng": test_lng
        }, headers=self.rider_headers)
        assert location_response.status_code == 200, f"Failed to update location: {location_response.text}"
        data = location_response.json()
        assert data["message"] == "Location updated"
        print(f"✓ Rider location updated to ({test_lat}, {test_lng})")
        
        # 7. Verify order has updated rider position
        order_check = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=self.customer_headers)
        assert order_check.status_code == 200
        updated_order = order_check.json()
        assert updated_order["rider_lat"] == test_lat, f"Expected rider_lat={test_lat}, got {updated_order.get('rider_lat')}"
        assert updated_order["rider_lng"] == test_lng, f"Expected rider_lng={test_lng}, got {updated_order.get('rider_lng')}"
        print("✓ Order has updated rider coordinates")
    
    def test_get_tracking_returns_real_gps(self):
        """Test GET /api/orders/{order_id}/tracking returns real GPS when available"""
        # 1. Setup: Create order, set ready, rider accepts
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = restaurants[0]
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json={
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "456 Test Ave, Dublin",
            "delivery_lat": 53.3400,
            "delivery_lng": -6.2500
        }, headers=self.customer_headers)
        order = order_response.json()
        order_id = order["id"]
        
        # Set to ready
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "ready"}, headers=self.customer_headers)
        
        # Rider online and accepts
        requests.put(f"{BASE_URL}/api/rider/online", json={"online": True}, headers=self.rider_headers)
        requests.post(f"{BASE_URL}/api/rider/accept/{order_id}", headers=self.rider_headers)
        
        # 2. Update rider location
        real_lat = 53.3480
        real_lng = -6.2550
        requests.put(f"{BASE_URL}/api/rider/location", json={
            "order_id": order_id,
            "lat": real_lat,
            "lng": real_lng
        }, headers=self.rider_headers)
        
        # 3. Get tracking - should return real GPS
        tracking_response = requests.get(f"{BASE_URL}/api/orders/{order_id}/tracking")
        assert tracking_response.status_code == 200, f"Tracking failed: {tracking_response.text}"
        tracking = tracking_response.json()
        
        assert tracking["rider_lat"] == real_lat, f"Expected rider_lat={real_lat}, got {tracking.get('rider_lat')}"
        assert tracking["rider_lng"] == real_lng, f"Expected rider_lng={real_lng}, got {tracking.get('rider_lng')}"
        assert tracking.get("gps_source") == "real", f"Expected gps_source='real', got {tracking.get('gps_source')}"
        print(f"✓ Tracking returns real GPS: ({tracking['rider_lat']}, {tracking['rider_lng']}), source={tracking['gps_source']}")
    
    def test_get_tracking_returns_simulated_when_no_recent_gps(self):
        """Test GET /api/orders/{order_id}/tracking returns simulated GPS when no recent update"""
        # 1. Setup: Create order, set ready, rider accepts
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = restaurants[0]
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json={
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "789 Test Blvd, Dublin",
            "delivery_lat": 53.3350,
            "delivery_lng": -6.2450
        }, headers=self.customer_headers)
        order = order_response.json()
        order_id = order["id"]
        
        # Set to ready
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "ready"}, headers=self.customer_headers)
        
        # Rider online and accepts (but does NOT send location updates)
        requests.put(f"{BASE_URL}/api/rider/online", json={"online": True}, headers=self.rider_headers)
        requests.post(f"{BASE_URL}/api/rider/accept/{order_id}", headers=self.rider_headers)
        
        # 2. Get tracking without any location updates - should return simulated
        tracking_response = requests.get(f"{BASE_URL}/api/orders/{order_id}/tracking")
        assert tracking_response.status_code == 200
        tracking = tracking_response.json()
        
        # Should have simulated GPS
        assert "rider_lat" in tracking
        assert "rider_lng" in tracking
        assert tracking.get("gps_source") == "simulated", f"Expected gps_source='simulated', got {tracking.get('gps_source')}"
        assert "delivery_progress" in tracking
        print(f"✓ Tracking returns simulated GPS: ({tracking['rider_lat']}, {tracking['rider_lng']}), source={tracking['gps_source']}, progress={tracking['delivery_progress']}%")
    
    def test_full_order_lifecycle_with_tracking(self):
        """Test complete order flow: create -> ready -> rider accepts -> location updates -> tracking"""
        # 1. Get restaurant and menu
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = next((r for r in restaurants if r["name"] == "Crazy Potato"), restaurants[0])
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        print(f"\n=== Full Order Lifecycle Test ===")
        print(f"Restaurant: {restaurant['name']}")
        print(f"Menu item: {menu_item['name']} - EUR {menu_item['price']}")
        
        # 2. Customer creates order
        order_response = requests.post(f"{BASE_URL}/api/orders", json={
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 2}],
            "delivery_address": "100 O'Connell Street, Dublin 1",
            "delivery_lat": 53.3498,
            "delivery_lng": -6.2603,
            "tip": 2.00
        }, headers=self.customer_headers)
        assert order_response.status_code == 200
        order = order_response.json()
        order_id = order["id"]
        assert order["status"] == "pending"
        print(f"✓ Step 1: Order created (status=pending), ID: {order_id[:8]}...")
        
        # 3. Restaurant accepts and prepares
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "accepted"}, headers=self.customer_headers)
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "preparing"}, headers=self.customer_headers)
        print("✓ Step 2: Order accepted and preparing")
        
        # 4. Restaurant marks ready
        ready_response = requests.put(f"{BASE_URL}/api/orders/{order_id}/status", 
            json={"status": "ready"}, headers=self.customer_headers)
        assert ready_response.status_code == 200
        print("✓ Step 3: Order ready for pickup")
        
        # 5. Rider goes online
        requests.put(f"{BASE_URL}/api/rider/online", json={"online": True}, headers=self.rider_headers)
        print("✓ Step 4: Rider online")
        
        # 6. Rider accepts order
        accept_response = requests.post(f"{BASE_URL}/api/rider/accept/{order_id}", headers=self.rider_headers)
        assert accept_response.status_code == 200
        
        # Verify order status is now picked_up
        order_check = requests.get(f"{BASE_URL}/api/orders/{order_id}", headers=self.customer_headers).json()
        assert order_check["status"] == "picked_up", f"Expected picked_up, got {order_check['status']}"
        print("✓ Step 5: Rider accepted (status=picked_up)")
        
        # 7. Rider sends GPS updates
        gps_positions = [
            (53.3510, -6.2620),  # Near restaurant
            (53.3505, -6.2615),  # Moving
            (53.3500, -6.2608),  # Closer to customer
        ]
        
        for lat, lng in gps_positions:
            loc_response = requests.put(f"{BASE_URL}/api/rider/location", json={
                "order_id": order_id,
                "lat": lat,
                "lng": lng
            }, headers=self.rider_headers)
            assert loc_response.status_code == 200
        print(f"✓ Step 6: Rider sent {len(gps_positions)} GPS updates")
        
        # 8. Customer checks tracking
        tracking = requests.get(f"{BASE_URL}/api/orders/{order_id}/tracking").json()
        assert tracking["status"] == "picked_up"
        assert tracking["gps_source"] == "real"
        assert tracking["rider_lat"] == gps_positions[-1][0]
        assert tracking["rider_lng"] == gps_positions[-1][1]
        print(f"✓ Step 7: Tracking shows real GPS at ({tracking['rider_lat']}, {tracking['rider_lng']})")
        
        # 9. Verify rider profile also updated
        rider_profile = requests.get(f"{BASE_URL}/api/rider/profile", headers=self.rider_headers).json()
        assert rider_profile["current_lat"] == gps_positions[-1][0]
        assert rider_profile["current_lng"] == gps_positions[-1][1]
        print(f"✓ Step 8: Rider profile position updated")
        
        print(f"\n=== Lifecycle Test Complete ===")
        print(f"Order ID: {order_id}")
        print(f"Final status: {tracking['status']}")
        print(f"GPS source: {tracking['gps_source']}")
        print(f"Rider position: ({tracking['rider_lat']}, {tracking['rider_lng']})")


class TestRiderActiveOrders:
    """Tests for rider active orders endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test users"""
        requests.post(f"{BASE_URL}/api/seed")
        
        # Login rider
        rider_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RIDER_EMAIL,
            "password": RIDER_PASSWORD
        })
        if rider_login.status_code != 200:
            rider_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Test Rider",
                "email": RIDER_EMAIL,
                "password": RIDER_PASSWORD,
                "role": "rider"
            })
            self.rider_token = rider_reg.json().get("token")
        else:
            self.rider_token = rider_login.json().get("token")
        
        self.rider_headers = {"Authorization": f"Bearer {self.rider_token}"}
    
    def test_get_rider_active_orders(self):
        """Test GET /api/rider/active-orders returns picked_up orders"""
        response = requests.get(f"{BASE_URL}/api/rider/active-orders", headers=self.rider_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned orders should be picked_up status
        for order in data:
            assert order["status"] == "picked_up", f"Expected picked_up, got {order['status']}"
        
        print(f"✓ Rider has {len(data)} active orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
