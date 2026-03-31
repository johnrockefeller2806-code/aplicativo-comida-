import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import OrderTracker from "./OrderTracker";
import AddressAutocomplete from "./AddressAutocomplete";
import QRScanner from "./QRScanner";
import {
  ShoppingBag, Search, Clock, Star, MapPin, Plus, Minus, ShoppingCart,
  X, ChevronRight, LogOut, Package, ArrowLeft, Check, Utensils,
  Instagram, Phone, Facebook, MessageCircle, QrCode
} from "lucide-react";

const NavBar = ({ cartCount, onCartClick, onOrdersClick, activeView, onBack, onLogout }) => (
  <nav className="glass-nav sticky top-0 z-50 px-6 py-3">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        {activeView !== "restaurants" && (
          <button onClick={onBack} className="p-2 hover:bg-black/5 rounded-lg transition-colors" data-testid="back-nav-btn">
            <ArrowLeft className="w-5 h-5 text-[#5C635A]" />
          </button>
        )}
        <img src="/logo.png" alt="Kangaroos" className="w-9 h-9 object-contain" />
        <span className="font-heading font-bold text-lg text-[#1A1D1A]">Kangaroos</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onOrdersClick} className="p-2 hover:bg-black/5 rounded-lg transition-colors relative" data-testid="orders-nav-btn">
          <Package className="w-5 h-5 text-[#5C635A]" />
        </button>
        <button onClick={onCartClick} className="p-2 hover:bg-black/5 rounded-lg transition-colors relative" data-testid="cart-nav-btn">
          <ShoppingCart className="w-5 h-5 text-[#5C635A]" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D97746] text-white rounded-full text-xs flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </button>
        <button onClick={onLogout} className="p-2 hover:bg-black/5 rounded-lg transition-colors" data-testid="logout-btn">
          <LogOut className="w-5 h-5 text-[#5C635A]" />
        </button>
      </div>
    </div>
  </nav>
);

export default function CustomerApp() {
  const { user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeView, setActiveView] = useState("restaurants");
  const [search, setSearch] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [tip, setTip] = useState(0);
  const [deliveryFeeInfo, setDeliveryFeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);

  useEffect(() => {
    axios.get(`${API}/restaurants`).then(r => { setRestaurants(r.data); setLoading(false); }).catch(() => setLoading(false));
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  const loadMenu = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    const res = await axios.get(`${API}/restaurants/${restaurant.id}/menu`);
    setMenu(res.data);
    setActiveView("menu");
  };

  const loadOrders = useCallback(async () => {
    const res = await axios.get(`${API}/orders`);
    setOrders(res.data);
    setActiveView("orders");
  }, []);

  // Handle customer QR scan to confirm delivery
  const handleQRScan = async (qrData) => {
    if (qrProcessing) return;
    setQrProcessing(true);
    try {
      const res = await axios.post(`${API}/customer/confirm-delivery`, { qr_data: qrData });
      toast.success(res.data.message || "Entrega confirmada! Obrigado!");
      setShowQRScanner(false);
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "QR Code inválido");
    } finally {
      setQrProcessing(false);
    }
  };

  // Auto-refresh orders when viewing them
  useEffect(() => {
    if (activeView !== "orders") return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/orders`);
        setOrders(res.data);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeView]);

  const addToCart = (item) => {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, restaurant_id: item.restaurant_id }]);
    }
    toast.success(`${item.name} added`);
  };

  const updateCartQty = (itemId, delta) => {
    setCart(cart.map(c => {
      if (c.menu_item_id === itemId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const deliveryFee = deliveryFeeInfo?.delivery_fee || 6.00;
  const distanceKm = deliveryFeeInfo?.distance_km || 2.0;

  // Fetch delivery fee when entering cart
  useEffect(() => {
    if (activeView === "cart" && cart.length > 0) {
      axios.get(`${API}/delivery-fee`, { params: { restaurant_id: cart[0].restaurant_id } })
        .then(r => setDeliveryFeeInfo(r.data))
        .catch(() => {});
    }
  }, [activeView, cart]);

  const placeOrder = async () => {
    if (!deliveryAddress.trim()) { toast.error("Enter delivery address"); return; }
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    try {
      const res = await axios.post(`${API}/orders`, {
        restaurant_id: cart[0].restaurant_id,
        items: cart.map(c => ({ menu_item_id: c.menu_item_id, quantity: c.quantity })),
        delivery_address: deliveryAddress,
        delivery_lat: deliveryCoords?.lat || null,
        delivery_lng: deliveryCoords?.lng || null,
        customer_phone: customerPhone || null,
        tip: tip
      });
      toast.success("Order placed!");
      setCart([]);
      setDeliveryAddress("");
      setCustomerPhone("");
      setTip(0);
      setDeliveryFeeInfo(null);
      loadOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error placing order");
    }
  };

  const handleBack = () => {
    if (activeView === "menu") setActiveView("restaurants");
    else if (activeView === "cart" || activeView === "orders") setActiveView("restaurants");
    else setActiveView("restaurants");
  };

  const filtered = restaurants.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(menu.map(m => m.category))];

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="customer-app">
      <NavBar
        cartCount={cart.reduce((s, c) => s + c.quantity, 0)}
        onCartClick={() => setActiveView("cart")}
        onOrdersClick={loadOrders}
        activeView={activeView}
        onBack={handleBack}
        onLogout={logout}
      />

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Restaurants List */}
        {activeView === "restaurants" && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="font-heading font-bold text-3xl text-[#1A1D1A] mb-1">Hey, {user?.name}!</h1>
              <p className="text-[#5C635A]">What are you craving today?</p>
            </div>

            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C635A]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search restaurants..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-1 focus:ring-[#D97746] outline-none"
                data-testid="search-input"
              />
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <div key={i} className="h-64 bg-[#F3EFE9] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(r => (
                  <button
                    key={r.id}
                    onClick={() => loadMenu(r)}
                    className="bg-white rounded-2xl border border-[#E5E1D8] overflow-hidden text-left card-hover group"
                    data-testid={`restaurant-card-${r.id}`}
                  >
                    <div className="h-40 bg-[#F3EFE9] overflow-hidden">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Utensils className="w-12 h-12 text-[#D5CFC5]" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-heading font-bold text-lg">{r.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-[#D97746] font-semibold">
                          <Star className="w-4 h-4 fill-[#D97746]" />
                          {r.rating || "4.5"}
                        </div>
                      </div>
                      <p className="text-sm text-[#5C635A] mb-3 line-clamp-1">{r.description}</p>
                      <div className="flex items-center gap-4 text-xs text-[#5C635A]">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.prep_time_min || 25} min</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.cuisine_type}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Menu View */}
        {activeView === "menu" && selectedRestaurant && (
          <div className="animate-fade-in-up">
            {/* Restaurant Hero Image */}
            {selectedRestaurant.image_url && (
              <div className="relative -mx-6 -mt-6 mb-6 h-56 overflow-hidden rounded-b-3xl" data-testid="menu-hero-image">
                <img
                  src={selectedRestaurant.image_url}
                  alt={selectedRestaurant.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D1A]/60 to-transparent" />
              </div>
            )}
            {/* Restaurant Header with Contact */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-heading font-bold text-3xl text-[#1A1D1A]">{selectedRestaurant.name}</h1>
                  {selectedRestaurant.slogan && (
                    <p className="text-[#D97746] font-semibold text-sm mt-1">{selectedRestaurant.slogan}</p>
                  )}
                  <p className="text-[#5C635A] mt-1">{selectedRestaurant.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 fill-[#D97746] text-[#D97746]" />
                  <span className="font-bold">{selectedRestaurant.rating || "4.5"}</span>
                  <span className="text-[#5C635A]">|</span>
                  <Clock className="w-4 h-4 text-[#5C635A]" />
                  <span className="text-[#5C635A]">{selectedRestaurant.prep_time_min || 25} min</span>
                </div>
              </div>

              {/* Contact Bar */}
              {selectedRestaurant.contact && (
                <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="restaurant-contact-bar">
                  {selectedRestaurant.contact.instagram && (
                    <a
                      href={selectedRestaurant.contact.instagram_url || `https://instagram.com/${selectedRestaurant.contact.instagram.replace('@','')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                      data-testid="contact-instagram"
                    >
                      <Instagram className="w-4 h-4" />
                      {selectedRestaurant.contact.instagram}
                    </a>
                  )}
                  {selectedRestaurant.contact.whatsapp && (
                    <a
                      href={`https://wa.me/${selectedRestaurant.contact.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition-colors"
                      data-testid="contact-whatsapp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {selectedRestaurant.contact.whatsapp}
                    </a>
                  )}
                  {selectedRestaurant.contact.facebook && (
                    <a
                      href={selectedRestaurant.contact.facebook_url || `https://facebook.com/${selectedRestaurant.contact.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                      data-testid="contact-facebook"
                    >
                      <Facebook className="w-4 h-4" />
                      {selectedRestaurant.contact.facebook}
                    </a>
                  )}
                </div>
              )}
            </div>

            {categories.map(cat => (
              <div key={cat} className="mb-8">
                <h2 className="font-heading font-bold text-xl mb-4 text-[#1A1D1A] border-b border-[#E5E1D8] pb-2">{cat}</h2>
                <div className="space-y-3">
                  {menu.filter(m => m.category === cat).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E5E1D8] p-4 card-hover" data-testid={`menu-item-${item.id}`}>
                      <div className="flex-1 mr-4">
                        <h3 className="font-semibold text-[#1A1D1A]">{item.name}</h3>
                        {item.description && <p className="text-sm text-[#5C635A] mt-0.5 line-clamp-1">{item.description}</p>}
                        {item.allergens && <p className="text-xs text-[#D97746] mt-1">Allergens: {item.allergens}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-heading font-bold text-lg text-[#1A1D1A]">EUR {item.price.toFixed(2)}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-2 bg-[#D97746] text-white rounded-lg hover:bg-[#C46838] transition-colors active:scale-90"
                          data-testid={`add-to-cart-${item.id}`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <button
                  onClick={() => setActiveView("cart")}
                  className="flex items-center gap-4 px-8 py-4 bg-[#1E3F20] text-white rounded-full shadow-xl hover:bg-[#163018] transition-all active:scale-95"
                  data-testid="view-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-bold">View Cart ({cart.reduce((s,c)=>s+c.quantity,0)})</span>
                  <span className="font-heading font-bold">EUR {cartTotal.toFixed(2)}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cart View */}
        {activeView === "cart" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <h1 className="font-heading font-bold text-3xl text-[#1A1D1A] mb-6">Your Cart</h1>

            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-16 h-16 text-[#D5CFC5] mx-auto mb-4" />
                <p className="text-[#5C635A] text-lg">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.menu_item_id} className="flex items-center justify-between bg-white rounded-xl border border-[#E5E1D8] p-4" data-testid={`cart-item-${item.menu_item_id}`}>
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-[#5C635A]">EUR {item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateCartQty(item.menu_item_id, -1)} className="p-1.5 bg-[#F3EFE9] rounded-lg hover:bg-[#E5E1D8] transition-colors" data-testid={`qty-minus-${item.menu_item_id}`}>
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.menu_item_id, 1)} className="p-1.5 bg-[#F3EFE9] rounded-lg hover:bg-[#E5E1D8] transition-colors" data-testid={`qty-plus-${item.menu_item_id}`}>
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="font-heading font-bold ml-2">EUR {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-[#E5E1D8] p-5 mb-6">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#5C635A]">Subtotal</span>
                    <span className="font-semibold">EUR {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#5C635A] flex items-center gap-1">
                      Delivery (EUR 6.00 + {distanceKm.toFixed(1)} km x EUR 1.50)
                    </span>
                    <span className="font-semibold">EUR {deliveryFee.toFixed(2)}</span>
                  </div>
                  {tip > 0 && (
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="text-green-600 font-medium">Tip for rider</span>
                      <span className="font-semibold text-green-600">EUR {tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-[#E5E1D8]">
                    <span className="font-heading font-bold text-lg">Total</span>
                    <span className="font-heading font-bold text-lg text-[#D97746]">EUR {(cartTotal + deliveryFee + tip).toFixed(2)}</span>
                  </div>
                </div>

                {/* Tip Section */}
                <div className="bg-white rounded-xl border border-[#E5E1D8] p-5 mb-6" data-testid="tip-section">
                  <label className="block text-sm font-semibold text-[#1A1D1A] mb-3">
                    Tip your rider
                  </label>
                  <p className="text-xs text-[#5C635A] mb-3">100% of the tip goes directly to your rider</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[0, 1, 2, 3, 5].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setTip(amount)}
                        className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                          tip === amount
                            ? "bg-[#D97746] text-white shadow-md"
                            : "bg-[#F3EFE9] text-[#1A1D1A] hover:bg-[#E5E1D8]"
                        }`}
                        data-testid={`tip-${amount}`}
                      >
                        {amount === 0 ? "No tip" : `EUR ${amount}`}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#5C635A] font-medium">EUR</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={tip || ""}
                      onChange={e => setTip(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Custom amount"
                      className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#FAF9F6] focus:border-[#D97746] focus:ring-1 focus:ring-[#D97746] outline-none text-sm"
                      data-testid="tip-custom-input"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#5C635A] mb-1">Delivery Address</label>
                  <AddressAutocomplete
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    placeholder="Digite seu endereço em Dublin..."
                    onSelect={(place) => {
                      setDeliveryAddress(place.address);
                      setDeliveryCoords({ lat: place.lat, lng: place.lng });
                    }}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#5C635A] mb-1">
                    WhatsApp / Phone (for rider contact)
                  </label>
                  <div className="relative">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+353 89 123 4567"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                      data-testid="customer-phone-input"
                    />
                  </div>
                  <p className="text-xs text-[#5C635A] mt-1">Share your number so the rider can contact you at delivery</p>
                </div>

                <button
                  onClick={placeOrder}
                  className="w-full py-4 bg-[#D97746] text-white rounded-xl font-bold text-lg hover:bg-[#C46838] transition-all active:scale-95"
                  data-testid="place-order-btn"
                >
                  Place Order - EUR {(cartTotal + deliveryFee + tip).toFixed(2)}
                </button>
              </>
            )}
          </div>
        )}

        {/* Orders View */}
        {activeView === "orders" && (
          <div className="animate-fade-in-up max-w-2xl mx-auto">
            <h1 className="font-heading font-bold text-3xl text-[#1A1D1A] mb-6">My Orders</h1>

            {orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-[#D5CFC5] mx-auto mb-4" />
                <p className="text-[#5C635A] text-lg">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order.id}>
                    <OrderTracker order={order} variant="customer" />
                    {/* Scan QR button when order is being delivered */}
                    {order.status === "picked_up" && (
                      <div className="mx-5 mb-4">
                        <button
                          onClick={() => setShowQRScanner(true)}
                          className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#163018] transition-colors"
                          data-testid={`scan-qr-btn-${order.id}`}
                        >
                          <QrCode className="w-5 h-5" />
                          Escanear QR do Entregador
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-2">
                          Escaneie o QR Code do entregador para confirmar que recebeu a comida
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowQRScanner(false)}
            isProcessing={qrProcessing}
          />
        )}
      </main>
    </div>
  );
}
