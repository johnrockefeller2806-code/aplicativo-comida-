"""
Kangaroos Fast Delivery API Tests
Tests for: Auth, Restaurants, Menu, Orders, Rider functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_"

class TestHealth:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["app"] == "Kangaroos Fast Delivery API"
        print("✓ Health endpoint working")


class TestSeedData:
    """Seed data endpoint tests"""
    
    def test_seed_endpoint(self):
        """Test seed data creation"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        data = response.json()
        # Either creates new data or says already seeded
        assert "message" in data
        print(f"✓ Seed endpoint: {data['message']}")


class TestRestaurants:
    """Restaurant listing and menu tests"""
    
    def test_list_restaurants(self):
        """Test GET /api/restaurants returns seeded restaurants"""
        response = requests.get(f"{BASE_URL}/api/restaurants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3, "Should have at least 3 seeded restaurants"
        
        # Verify seeded restaurant names
        names = [r["name"] for r in data]
        assert "Crazy Potato" in names
        assert "Dublin Burger Co." in names
        assert "Sushi Garden" in names
        print(f"✓ Found {len(data)} restaurants including seeded ones")
    
    def test_get_restaurant_by_id(self):
        """Test GET /api/restaurants/{id}"""
        # First get list to get an ID
        list_response = requests.get(f"{BASE_URL}/api/restaurants")
        restaurants = list_response.json()
        restaurant_id = restaurants[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/restaurants/{restaurant_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == restaurant_id
        assert "name" in data
        assert "address" in data
        print(f"✓ Got restaurant: {data['name']}")
    
    def test_get_restaurant_menu(self):
        """Test GET /api/restaurants/{id}/menu"""
        # Get Crazy Potato restaurant
        list_response = requests.get(f"{BASE_URL}/api/restaurants")
        restaurants = list_response.json()
        crazy_potato = next((r for r in restaurants if r["name"] == "Crazy Potato"), None)
        assert crazy_potato is not None
        
        response = requests.get(f"{BASE_URL}/api/restaurants/{crazy_potato['id']}/menu")
        assert response.status_code == 200
        menu = response.json()
        assert isinstance(menu, list)
        assert len(menu) > 0, "Crazy Potato should have menu items"
        
        # Verify menu item structure
        item = menu[0]
        assert "id" in item
        assert "name" in item
        assert "price" in item
        assert "category" in item
        print(f"✓ Crazy Potato has {len(menu)} menu items")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_register_customer(self):
        """Test POST /api/auth/register for customer"""
        unique_email = f"{TEST_PREFIX}customer_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Test Customer",
            "email": unique_email,
            "password": "testpass123",
            "role": "customer"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "customer"
        print(f"✓ Registered customer: {unique_email}")
        return data["token"], data["user"]
    
    def test_register_restaurant(self):
        """Test POST /api/auth/register for restaurant owner"""
        unique_email = f"{TEST_PREFIX}restaurant_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Test Restaurant Owner",
            "email": unique_email,
            "password": "testpass123",
            "role": "restaurant"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "restaurant"
        print(f"✓ Registered restaurant owner: {unique_email}")
        return data["token"], data["user"]
    
    def test_register_rider(self):
        """Test POST /api/auth/register for rider"""
        unique_email = f"{TEST_PREFIX}rider_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Test Rider",
            "email": unique_email,
            "password": "testpass123",
            "role": "rider"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "rider"
        print(f"✓ Registered rider: {unique_email}")
        return data["token"], data["user"]
    
    def test_login_success(self):
        """Test POST /api/auth/login with valid credentials"""
        # First register a user
        unique_email = f"{TEST_PREFIX}login_{uuid.uuid4().hex[:8]}@test.com"
        register_payload = {
            "name": "Login Test User",
            "email": unique_email,
            "password": "testpass123",
            "role": "customer"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=register_payload)
        
        # Now login
        login_payload = {
            "email": unique_email,
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ Login successful for: {unique_email}")
    
    def test_login_invalid_credentials(self):
        """Test POST /api/auth/login with invalid credentials"""
        payload = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_duplicate_email_registration(self):
        """Test that duplicate email registration fails"""
        unique_email = f"{TEST_PREFIX}dup_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "First User",
            "email": unique_email,
            "password": "testpass123",
            "role": "customer"
        }
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response1.status_code == 200
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response2.status_code == 400
        print("✓ Duplicate email registration correctly rejected")
    
    def test_get_me_authenticated(self):
        """Test GET /api/auth/me with valid token"""
        # Register and get token
        unique_email = f"{TEST_PREFIX}me_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Me Test User",
            "email": unique_email,
            "password": "testpass123",
            "role": "customer"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        token = reg_response.json()["token"]
        
        # Get me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email
        print(f"✓ GET /api/auth/me returned correct user")
    
    def test_get_me_unauthenticated(self):
        """Test GET /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated /api/auth/me correctly rejected")


class TestOrders:
    """Order creation and management tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Create a customer and return token"""
        unique_email = f"{TEST_PREFIX}ordercust_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Order Test Customer",
            "email": unique_email,
            "password": "testpass123",
            "role": "customer"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        return response.json()["token"]
    
    def test_create_order(self, customer_token):
        """Test POST /api/orders creates order with payment split"""
        # Get a restaurant and menu item
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = restaurants[0]
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        order_payload = {
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 2}],
            "delivery_address": "123 Test Street, Dublin"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers)
        assert response.status_code == 200
        order = response.json()
        
        # Verify order structure
        assert "id" in order
        assert order["restaurant_id"] == restaurant["id"]
        assert order["status"] == "pending"
        assert order["delivery_address"] == "123 Test Street, Dublin"
        
        # Verify payment split
        assert "subtotal" in order
        assert "delivery_fee" in order
        assert order["delivery_fee"] == 2.99
        assert "platform_fee" in order
        assert "restaurant_amount" in order
        assert "rider_amount" in order
        assert order["rider_amount"] == 2.99  # Delivery fee goes to rider
        
        # Verify total calculation
        expected_total = round(order["subtotal"] + 2.99, 2)
        assert order["total"] == expected_total
        
        print(f"✓ Order created with payment split: Restaurant EUR {order['restaurant_amount']}, Rider EUR {order['rider_amount']}, Platform EUR {order['platform_amount']}")
        return order
    
    def test_get_customer_orders(self, customer_token):
        """Test GET /api/orders returns customer's orders"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Create an order first
        restaurants = requests.get(f"{BASE_URL}/api/restaurants").json()
        restaurant = restaurants[0]
        menu = requests.get(f"{BASE_URL}/api/restaurants/{restaurant['id']}/menu").json()
        menu_item = menu[0]
        
        order_payload = {
            "restaurant_id": restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "456 Test Ave, Dublin"
        }
        requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers)
        
        # Get orders
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers)
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        assert len(orders) >= 1
        print(f"✓ Customer has {len(orders)} orders")


class TestOrderStatus:
    """Order status update tests"""
    
    @pytest.fixture
    def setup_order(self):
        """Create customer, order, and return tokens"""
        # Create customer
        cust_email = f"{TEST_PREFIX}statuscust_{uuid.uuid4().hex[:8]}@test.com"
        cust_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Status Test Customer",
            "email": cust_email,
            "password": "testpass123",
            "role": "customer"
        })
        cust_token = cust_response.json()["token"]
        
        # Create restaurant owner
        rest_email = f"{TEST_PREFIX}statusrest_{uuid.uuid4().hex[:8]}@test.com"
        rest_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Status Test Restaurant",
            "email": rest_email,
            "password": "testpass123",
            "role": "restaurant"
        })
        rest_token = rest_response.json()["token"]
        
        # Get the restaurant created for this owner
        rest_headers = {"Authorization": f"Bearer {rest_token}"}
        my_restaurant = requests.get(f"{BASE_URL}/api/restaurant/my", headers=rest_headers).json()
        
        # Add a menu item to the restaurant
        menu_item_payload = {
            "name": "Test Item",
            "description": "Test description",
            "price": 10.00,
            "category": "Main"
        }
        menu_response = requests.post(
            f"{BASE_URL}/api/restaurants/{my_restaurant['id']}/menu",
            json=menu_item_payload,
            headers=rest_headers
        )
        menu_item = menu_response.json()
        
        # Create order
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        order_payload = {
            "restaurant_id": my_restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "789 Status Test St, Dublin"
        }
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=cust_headers)
        order = order_response.json()
        
        return {
            "cust_token": cust_token,
            "rest_token": rest_token,
            "order": order,
            "restaurant": my_restaurant
        }
    
    def test_update_order_status_accepted(self, setup_order):
        """Test PUT /api/orders/{id}/status to accepted"""
        headers = {"Authorization": f"Bearer {setup_order['rest_token']}"}
        order_id = setup_order["order"]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "accepted"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Order status updated to accepted")
    
    def test_update_order_status_preparing(self, setup_order):
        """Test order status flow: accepted -> preparing"""
        headers = {"Authorization": f"Bearer {setup_order['rest_token']}"}
        order_id = setup_order["order"]["id"]
        
        # First accept
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "accepted"}, headers=headers)
        
        # Then preparing
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "preparing"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Order status updated to preparing")
    
    def test_update_order_status_ready(self, setup_order):
        """Test order status flow: accepted -> preparing -> ready"""
        headers = {"Authorization": f"Bearer {setup_order['rest_token']}"}
        order_id = setup_order["order"]["id"]
        
        # Accept -> Preparing -> Ready
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "accepted"}, headers=headers)
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "preparing"}, headers=headers)
        
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "ready"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Order status updated to ready")


class TestRider:
    """Rider functionality tests"""
    
    @pytest.fixture
    def rider_token(self):
        """Create a rider and return token"""
        unique_email = f"{TEST_PREFIX}ridertest_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "name": "Rider Test User",
            "email": unique_email,
            "password": "testpass123",
            "role": "rider"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        return response.json()["token"]
    
    def test_get_rider_profile(self, rider_token):
        """Test GET /api/rider/profile"""
        headers = {"Authorization": f"Bearer {rider_token}"}
        response = requests.get(f"{BASE_URL}/api/rider/profile", headers=headers)
        assert response.status_code == 200
        profile = response.json()
        
        assert "id" in profile
        assert "online" in profile
        assert profile["online"] == False  # Default offline
        assert "rider_type" in profile
        assert "total_earnings" in profile
        assert "total_deliveries" in profile
        print(f"✓ Rider profile retrieved: type={profile['rider_type']}, online={profile['online']}")
    
    def test_toggle_rider_online(self, rider_token):
        """Test PUT /api/rider/online"""
        headers = {"Authorization": f"Bearer {rider_token}"}
        
        # Go online
        response = requests.put(f"{BASE_URL}/api/rider/online", json={"online": True}, headers=headers)
        assert response.status_code == 200
        assert response.json()["online"] == True
        
        # Verify profile shows online
        profile = requests.get(f"{BASE_URL}/api/rider/profile", headers=headers).json()
        assert profile["online"] == True
        
        # Go offline
        response = requests.put(f"{BASE_URL}/api/rider/online", json={"online": False}, headers=headers)
        assert response.status_code == 200
        assert response.json()["online"] == False
        print("✓ Rider online/offline toggle working")
    
    def test_get_available_orders_offline(self, rider_token):
        """Test GET /api/rider/available-orders when offline"""
        headers = {"Authorization": f"Bearer {rider_token}"}
        response = requests.get(f"{BASE_URL}/api/rider/available-orders", headers=headers)
        assert response.status_code == 200
        orders = response.json()
        assert orders == []  # Should be empty when offline
        print("✓ Available orders empty when rider offline")
    
    def test_get_rider_earnings(self, rider_token):
        """Test GET /api/rider/earnings"""
        headers = {"Authorization": f"Bearer {rider_token}"}
        response = requests.get(f"{BASE_URL}/api/rider/earnings", headers=headers)
        assert response.status_code == 200
        earnings = response.json()
        
        assert "total_earnings" in earnings
        assert "total_deliveries" in earnings
        assert "weekly_hours" in earnings
        assert "rider_type" in earnings
        assert "recent_payments" in earnings
        print(f"✓ Rider earnings: EUR {earnings['total_earnings']}, {earnings['total_deliveries']} deliveries")


class TestRiderDeliveryFlow:
    """Complete rider delivery flow tests"""
    
    def test_complete_delivery_flow(self):
        """Test full flow: order ready -> rider accepts -> rider completes -> earnings update"""
        # 1. Create customer
        cust_email = f"{TEST_PREFIX}flowcust_{uuid.uuid4().hex[:8]}@test.com"
        cust_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Flow Test Customer",
            "email": cust_email,
            "password": "testpass123",
            "role": "customer"
        })
        cust_token = cust_response.json()["token"]
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        
        # 2. Create restaurant owner
        rest_email = f"{TEST_PREFIX}flowrest_{uuid.uuid4().hex[:8]}@test.com"
        rest_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Flow Test Restaurant",
            "email": rest_email,
            "password": "testpass123",
            "role": "restaurant"
        })
        rest_token = rest_response.json()["token"]
        rest_headers = {"Authorization": f"Bearer {rest_token}"}
        
        # 3. Get restaurant and add menu item
        my_restaurant = requests.get(f"{BASE_URL}/api/restaurant/my", headers=rest_headers).json()
        menu_item = requests.post(
            f"{BASE_URL}/api/restaurants/{my_restaurant['id']}/menu",
            json={"name": "Flow Test Item", "price": 15.00, "category": "Main"},
            headers=rest_headers
        ).json()
        
        # 4. Create order
        order = requests.post(f"{BASE_URL}/api/orders", json={
            "restaurant_id": my_restaurant["id"],
            "items": [{"menu_item_id": menu_item["id"], "quantity": 1}],
            "delivery_address": "Flow Test Address, Dublin"
        }, headers=cust_headers).json()
        order_id = order["id"]
        
        # 5. Restaurant accepts and marks ready
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "accepted"}, headers=rest_headers)
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "preparing"}, headers=rest_headers)
        requests.put(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "ready"}, headers=rest_headers)
        
        # 6. Create rider and go online
        rider_email = f"{TEST_PREFIX}flowrider_{uuid.uuid4().hex[:8]}@test.com"
        rider_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Flow Test Rider",
            "email": rider_email,
            "password": "testpass123",
            "role": "rider"
        })
        rider_token = rider_response.json()["token"]
        rider_headers = {"Authorization": f"Bearer {rider_token}"}
        
        # Go online
        requests.put(f"{BASE_URL}/api/rider/online", json={"online": True}, headers=rider_headers)
        
        # 7. Check available orders
        available = requests.get(f"{BASE_URL}/api/rider/available-orders", headers=rider_headers).json()
        assert len(available) >= 1, "Should see at least one available order"
        
        # Find our order
        our_order = next((o for o in available if o["id"] == order_id), None)
        assert our_order is not None, "Our order should be in available orders"
        print(f"✓ Order {order_id[:8]} visible to rider")
        
        # 8. Rider accepts order
        accept_response = requests.post(f"{BASE_URL}/api/rider/accept/{order_id}", headers=rider_headers)
        assert accept_response.status_code == 200
        print(f"✓ Rider accepted order")
        
        # 9. Check active orders
        active = requests.get(f"{BASE_URL}/api/rider/active-orders", headers=rider_headers).json()
        assert len(active) >= 1
        print(f"✓ Order in rider's active orders")
        
        # 10. Get initial earnings
        initial_earnings = requests.get(f"{BASE_URL}/api/rider/earnings", headers=rider_headers).json()
        initial_total = initial_earnings["total_earnings"]
        initial_deliveries = initial_earnings["total_deliveries"]
        
        # 11. Complete delivery
        complete_response = requests.post(f"{BASE_URL}/api/rider/complete/{order_id}", headers=rider_headers)
        assert complete_response.status_code == 200
        complete_data = complete_response.json()
        assert "earnings" in complete_data
        assert complete_data["earnings"] == 2.99  # Delivery fee
        print(f"✓ Delivery completed, earned EUR {complete_data['earnings']}")
        
        # 12. Verify earnings updated
        final_earnings = requests.get(f"{BASE_URL}/api/rider/earnings", headers=rider_headers).json()
        assert final_earnings["total_earnings"] == initial_total + 2.99
        assert final_earnings["total_deliveries"] == initial_deliveries + 1
        assert len(final_earnings["recent_payments"]) >= 1
        print(f"✓ Earnings updated: EUR {final_earnings['total_earnings']}, {final_earnings['total_deliveries']} deliveries")


class TestRestaurantDashboard:
    """Restaurant dashboard tests"""
    
    @pytest.fixture
    def restaurant_setup(self):
        """Create restaurant owner and return token"""
        rest_email = f"{TEST_PREFIX}dashrest_{uuid.uuid4().hex[:8]}@test.com"
        rest_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dashboard Test Restaurant",
            "email": rest_email,
            "password": "testpass123",
            "role": "restaurant"
        })
        return rest_response.json()["token"]
    
    def test_get_my_restaurant(self, restaurant_setup):
        """Test GET /api/restaurant/my"""
        headers = {"Authorization": f"Bearer {restaurant_setup}"}
        response = requests.get(f"{BASE_URL}/api/restaurant/my", headers=headers)
        assert response.status_code == 200
        restaurant = response.json()
        assert "id" in restaurant
        assert "name" in restaurant
        assert "owner_id" in restaurant
        print(f"✓ Got my restaurant: {restaurant['name']}")
    
    def test_get_restaurant_orders(self, restaurant_setup):
        """Test GET /api/restaurant/orders"""
        headers = {"Authorization": f"Bearer {restaurant_setup}"}
        response = requests.get(f"{BASE_URL}/api/restaurant/orders", headers=headers)
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ Restaurant has {len(orders)} orders")
    
    def test_get_restaurant_stats(self, restaurant_setup):
        """Test GET /api/restaurant/stats"""
        headers = {"Authorization": f"Bearer {restaurant_setup}"}
        response = requests.get(f"{BASE_URL}/api/restaurant/stats", headers=headers)
        assert response.status_code == 200
        stats = response.json()
        assert "total_orders" in stats
        assert "today_orders" in stats
        assert "delivered" in stats
        assert "total_revenue" in stats
        print(f"✓ Restaurant stats: {stats['total_orders']} total orders, EUR {stats['total_revenue']} revenue")


class TestMenuManagement:
    """Menu item management tests"""
    
    @pytest.fixture
    def restaurant_with_menu(self):
        """Create restaurant owner and return token + restaurant"""
        rest_email = f"{TEST_PREFIX}menumgmt_{uuid.uuid4().hex[:8]}@test.com"
        rest_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Menu Management Test",
            "email": rest_email,
            "password": "testpass123",
            "role": "restaurant"
        })
        token = rest_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        restaurant = requests.get(f"{BASE_URL}/api/restaurant/my", headers=headers).json()
        return {"token": token, "restaurant": restaurant}
    
    def test_add_menu_item(self, restaurant_with_menu):
        """Test POST /api/restaurants/{id}/menu"""
        headers = {"Authorization": f"Bearer {restaurant_with_menu['token']}"}
        restaurant_id = restaurant_with_menu["restaurant"]["id"]
        
        item_payload = {
            "name": "Test Burger",
            "description": "A delicious test burger",
            "price": 12.99,
            "category": "Burgers",
            "allergens": "Gluten, Dairy"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/restaurants/{restaurant_id}/menu",
            json=item_payload,
            headers=headers
        )
        assert response.status_code == 200
        item = response.json()
        assert item["name"] == "Test Burger"
        assert item["price"] == 12.99
        assert item["category"] == "Burgers"
        print(f"✓ Added menu item: {item['name']} - EUR {item['price']}")
        return item
    
    def test_delete_menu_item(self, restaurant_with_menu):
        """Test DELETE /api/menu-items/{id}"""
        headers = {"Authorization": f"Bearer {restaurant_with_menu['token']}"}
        restaurant_id = restaurant_with_menu["restaurant"]["id"]
        
        # First add an item
        item = requests.post(
            f"{BASE_URL}/api/restaurants/{restaurant_id}/menu",
            json={"name": "To Delete", "price": 5.00, "category": "Test"},
            headers=headers
        ).json()
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/menu-items/{item['id']}", headers=headers)
        assert response.status_code == 200
        print(f"✓ Deleted menu item: {item['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
