import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import OrderTracker from "./OrderTracker";
import QRScanner from "./QRScanner";
import SimpleGoogleMap from "./SimpleGoogleMap";
import "leaflet/dist/leaflet.css";
import {
  Bike, Power, Package, DollarSign, Clock, LogOut, MapPin,
  Check, RefreshCw, Zap, AlertTriangle, TrendingUp, Timer,
  Bell, X, Volume2, Heart, Map as MapIcon, QrCode, Globe, Navigation
} from "lucide-react";

// Notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Play two quick beeps
    [0, 0.2].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime + delay);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  } catch {}
}

export default function RiderApp() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [available, setAvailable] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [activeTab, setActiveTab] = useState("deliveries");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [riderPosition, setRiderPosition] = useState({ lat: 53.3498, lng: -6.2603 });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [showRealMap, setShowRealMap] = useState(false);
  const [showDeliverooMap, setShowDeliverooMap] = useState(false);
  const prevUnreadRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, aRes, acRes, eRes] = await Promise.all([
        axios.get(`${API}/rider/profile`),
        axios.get(`${API}/rider/available-orders`),
        axios.get(`${API}/rider/active-orders`),
        axios.get(`${API}/rider/earnings`)
      ]);
      setProfile(pRes.data);
      setAvailable(aRes.data);
      setActiveOrders(acRes.data);
      setEarnings(eRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        axios.get(`${API}/rider/notifications`),
        axios.get(`${API}/rider/notifications/unread-count`)
      ]);
      setNotifications(nRes.data);
      const newCount = cRes.data.count;

      // Play sound and show alert if new notifications arrived
      if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        playNotificationSound();
        const latestUnread = nRes.data.find(n => !n.read);
        if (latestUnread) {
          setNewOrderAlert(latestUnread);
          // Auto-hide alert after 8 seconds
          setTimeout(() => setNewOrderAlert(null), 8000);
        }
      }
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchNotifications();
    // Fetch nearby restaurants
    axios.get(`${API}/rider/nearby-restaurants`).then(r => {
      setNearbyRestaurants(r.data.restaurants || []);
      setRadiusKm(r.data.radius_km || 5);
    }).catch(() => {});
    // Get rider's real position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setRiderPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // fallback to default Dublin center
      );
    }
    const dataInterval = setInterval(fetchData, 8000);
    const notifInterval = setInterval(fetchNotifications, 5000);
    return () => { clearInterval(dataInterval); clearInterval(notifInterval); };
  }, [fetchData, fetchNotifications]);

  const markAllRead = async () => {
    await axios.put(`${API}/rider/notifications/read-all`);
    setUnreadCount(0);
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const newState = !profile?.online;
      await axios.put(`${API}/rider/online`, { online: newState });
      toast.success(newState ? "You're online! Ready for orders." : "You're offline.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error");
    } finally {
      setToggling(false);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await axios.post(`${API}/rider/accept/${orderId}`);
      toast.success("Order accepted! Go pick it up.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error accepting order");
    }
  };

  const completeDelivery = async (orderId) => {
    try {
      const res = await axios.post(`${API}/rider/complete/${orderId}`);
      toast.success(`Delivery complete! You earned EUR ${res.data.earnings?.toFixed(2)}`);
      fetchData();
    } catch (err) {
      toast.error("Error completing delivery");
    }
  };

  const handleQRScan = async (qrData) => {
    if (qrProcessing) return;
    setQrProcessing(true);
    try {
      const res = await axios.post(`${API}/rider/validate-qr`, { qr_data: qrData });
      toast.success(res.data.message);
      setShowQRScanner(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "QR Code inválido");
    } finally {
      setQrProcessing(false);
    }
  };

  const isStudent = profile?.rider_type === "student";
  const hoursUsed = profile?.weekly_hours_used || 0;
  const hoursPercent = Math.min((hoursUsed / 20) * 100, 100);
  const hoursRemaining = Math.max(20 - hoursUsed, 0);

  const tabs = [
    { key: "deliveries", icon: Package, label: "Deliveries" },
    { key: "earnings", icon: DollarSign, label: "Earnings" },
    { key: "profile", icon: Bike, label: "Profile" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#D97746] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#FAF9F6] overflow-hidden flex flex-col" data-testid="rider-app">
      {/* Header */}
      <nav className="bg-black text-white px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bike className="w-6 h-6" />
            <div>
              <h1 className="font-heading font-bold text-lg">Rider Dashboard</h1>
              <p className="text-sm text-white/70">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); if (showNotifications) markAllRead(); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
                data-testid="notification-bell-btn"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D97746] text-white rounded-full text-[10px] flex items-center justify-center font-bold animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-[#E5E1D8] z-50 overflow-hidden" data-testid="notification-dropdown">
                  <div className="px-4 py-3 bg-[#F3EFE9] border-b border-[#E5E1D8] flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-[#1A1D1A]">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-[#D97746] font-semibold hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-[#5C635A] text-sm">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 15).map(n => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-[#F3EFE9] ${!n.read ? "bg-[#D97746]/5" : ""}`}
                          data-testid={`notification-${n.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? "bg-[#D97746]" : "bg-[#E5E1D8]"}`}>
                              <Package className={`w-4 h-4 ${!n.read ? "text-white" : "text-[#5C635A]"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!n.read ? "font-bold text-[#1A1D1A]" : "text-[#5C635A]"}`}>{n.title}</p>
                              <p className="text-xs text-[#5C635A] mt-0.5">{n.message}</p>
                              {n.delivery_address && (
                                <p className="text-xs text-[#5C635A] mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {n.delivery_address}
                                </p>
                              )}
                              <p className="text-[10px] text-[#B8B0A4] mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Online Toggle */}
            <button
              onClick={toggleOnline}
              disabled={toggling}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all active:scale-95 ${
                profile?.online
                  ? "bg-green-500 text-white"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              }`}
              data-testid="online-toggle-btn"
            >
              <Power className="w-4 h-4" />
              {profile?.online ? "ONLINE" : "OFFLINE"}
            </button>
            <button onClick={logout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="rider-logout-btn">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* New Order Alert Banner */}
      {newOrderAlert && (
        <div className="fixed top-4 left-4 right-4 z-[100] animate-fade-in-up" data-testid="new-order-alert">
          <div className="bg-white text-[#1A1D1A] px-5 py-4 shadow-2xl rounded-2xl border border-[#E5E1D8]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#D97746] rounded-full flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-base">{newOrderAlert.title}</p>
                <p className="text-sm text-[#5C635A]">{newOrderAlert.message}</p>
                {newOrderAlert.delivery_address && (
                  <p className="text-xs text-[#5C635A] flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {newOrderAlert.delivery_address}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => { setNewOrderAlert(null); setActiveTab("deliveries"); }}
                    className="px-4 py-2 bg-[#D97746] text-white rounded-full font-bold text-sm hover:bg-[#C46838] transition-colors active:scale-95"
                    data-testid="alert-view-btn"
                  >
                    View Orders
                  </button>
                  <button
                    onClick={() => setNewOrderAlert(null)}
                    className="px-4 py-2 bg-[#F3EFE9] text-[#5C635A] rounded-full font-medium text-sm hover:bg-[#E5E1D8] transition-colors"
                    data-testid="alert-close-btn"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Hours Warning */}
      {isStudent && (
        <div className="bg-white border-b border-[#E5E1D8] px-6 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#D97746]" />
                <span className="text-sm font-medium">Weekly Hours: {hoursUsed.toFixed(1)}h / 20h</span>
              </div>
              <span className="text-sm text-[#5C635A]">{hoursRemaining.toFixed(1)}h remaining</span>
            </div>
            <div className="w-full h-3 bg-[#F3EFE9] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hoursPercent >= 90 ? "bg-red-500" : hoursPercent >= 75 ? "bg-[#D97746]" : "bg-[#1E3F20]"
                }`}
                style={{ width: `${hoursPercent}%` }}
                data-testid="hours-progress-bar"
              />
            </div>
            {hoursUsed >= 16 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[#D97746]">
                <AlertTriangle className="w-4 h-4" />
                <span>{hoursUsed >= 19.5 ? "Almost at limit! You'll go offline at 20h." : `Warning: ${hoursRemaining.toFixed(1)}h remaining this week`}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#E5E1D8] bg-white flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-[#8B5E3C] text-[#8B5E3C]"
                  : "border-transparent text-[#5C635A] hover:text-[#1A1D1A]"
              }`}
              data-testid={`rider-tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-hidden">
        {/* Deliveries Tab */}
        {activeTab === "deliveries" && (
          <div className="h-full p-4 overflow-auto">
            {/* Google Maps - Full Screen (only when no active orders) */}
            {profile?.online && activeOrders.length === 0 && (
              <div className="h-full rounded-xl overflow-hidden border border-[#E5E1D8] shadow-lg">
                <SimpleGoogleMap height="100%" />
              </div>
            )}

            {/* Offline State */}
            {!profile?.online && (
              <div className="text-center py-16 flex flex-col items-center justify-center h-full">
                <Power className="w-16 h-16 text-[#D5CFC5] mx-auto mb-4" />
                <p className="text-[#5C635A] text-lg mb-4">You're offline</p>
                <button
                  onClick={toggleOnline}
                  className="px-8 py-3 bg-[#D97746] text-white rounded-full font-bold hover:bg-[#C46838] transition-all active:scale-95"
                  data-testid="go-online-btn"
                >
                  Go Online
                </button>
                {/* Logo */}
                <img 
                  src="/logo.png" 
                  alt="Kangaroos" 
                  className="mt-12 w-32 h-32 object-contain opacity-70"
                />
              </div>
            )}

            {/* Active Deliveries with Tracker */}
            {activeOrders.length > 0 && (
              <div className="max-w-lg mx-auto">
                <h2 className="font-heading font-bold text-xl mb-4 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full pulse-dot" />
                  Active Deliveries ({activeOrders.length}/3)
                </h2>
                <div className="space-y-6">
                  {activeOrders.map(order => (
                    <div key={order.id} data-testid={`active-delivery-${order.id}`}>
                      <OrderTracker order={order} variant="rider" />
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => setShowQRScanner(true)}
                          className="flex-1 py-4 bg-[#1E3F20] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#163018] transition-colors active:scale-95"
                          data-testid={`scan-qr-${order.id}`}
                        >
                          <QrCode className="w-5 h-5" /> Escanear QR - EUR {order.rider_amount?.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <div className="animate-fade-in-up">
            <h2 className="font-heading font-bold text-xl mb-6">Your Earnings</h2>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-[#E5E1D8] p-6 text-center" data-testid="total-earnings-card">
                <DollarSign className="w-8 h-8 text-[#D97746] mx-auto mb-2" />
                <p className="text-sm text-[#5C635A]">Total Earnings</p>
                <p className="font-heading font-bold text-3xl text-[#1A1D1A]">EUR {(earnings?.total_earnings || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E1D8] p-6 text-center" data-testid="total-deliveries-card">
                <Package className="w-8 h-8 text-[#1E3F20] mx-auto mb-2" />
                <p className="text-sm text-[#5C635A]">Total Deliveries</p>
                <p className="font-heading font-bold text-3xl text-[#1A1D1A]">{earnings?.total_deliveries || 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E1D8] p-6 text-center" data-testid="weekly-hours-card">
                <Clock className="w-8 h-8 text-[#8B5E3C] mx-auto mb-2" />
                <p className="text-sm text-[#5C635A]">Weekly Hours</p>
                <p className="font-heading font-bold text-3xl text-[#1A1D1A]">{(earnings?.weekly_hours || 0).toFixed(1)}h</p>
              </div>
            </div>

            {/* Payment Split Explanation */}
            <div className="bg-white rounded-xl border border-[#E5E1D8] p-6 mb-6">
              <h3 className="font-heading font-bold mb-4">How payment works</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#1E3F20]" />
                  <span className="text-sm">Restaurant receives the food cost</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#D97746]" />
                  <span className="text-sm font-semibold">You receive EUR 2.99 per delivery - INSTANTLY</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[#5C635A]" />
                  <span className="text-sm">Platform fee (15% of subtotal)</span>
                </div>
              </div>
              {/* Visual Split Bar */}
              <div className="flex h-4 rounded-full overflow-hidden mt-4">
                <div className="bg-[#1E3F20] flex-[6]" title="Restaurant" />
                <div className="bg-[#D97746] flex-[2]" title="Rider" />
                <div className="bg-[#5C635A] flex-[2]" title="Platform" />
              </div>
              <div className="flex justify-between text-xs mt-1 text-[#5C635A]">
                <span>Restaurant ~60%</span>
                <span className="font-semibold text-[#D97746]">You ~20%</span>
                <span>Platform ~20%</span>
              </div>
            </div>

            {/* Recent Payments */}
            <h3 className="font-heading font-bold mb-4">Recent Payments</h3>
            {earnings?.recent_payments?.length > 0 ? (
              <div className="space-y-2">
                {earnings.recent_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E5E1D8] p-4" data-testid={`payment-${p.id}`}>
                    <div>
                      <p className="font-semibold text-sm">Order #{p.order_id?.slice(0, 8)}</p>
                      <p className="text-xs text-[#5C635A]">{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="font-heading font-bold text-green-600">+EUR {p.rider_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#5C635A]">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No payments yet. Start delivering!</p>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="animate-fade-in-up max-w-lg mx-auto">
            <h2 className="font-heading font-bold text-xl mb-6">Rider Profile</h2>

            <div className="bg-white rounded-xl border border-[#E5E1D8] p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#D97746]/10 rounded-full flex items-center justify-center">
                  <Bike className="w-8 h-8 text-[#D97746]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl">{user?.name}</h3>
                  <p className="text-sm text-[#5C635A]">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-[#E5E1D8]">
                  <span className="text-[#5C635A]">Rider Type</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                    isStudent ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`} data-testid="rider-type-badge">
                    {isStudent ? "Student (20h/week)" : "Independent"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-[#E5E1D8]">
                  <span className="text-[#5C635A]">Vehicle</span>
                  <span className="font-semibold capitalize">{profile?.vehicle_type || "Bicycle"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[#E5E1D8]">
                  <span className="text-[#5C635A]">Total Deliveries</span>
                  <span className="font-semibold">{profile?.total_deliveries || 0}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[#5C635A]">Total Earnings</span>
                  <span className="font-heading font-bold text-[#D97746]">EUR {(profile?.total_earnings || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {isStudent && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h3 className="font-heading font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Timer className="w-5 h-5" /> Student Rider Info
                </h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>- Max 20 hours per week</li>
                  <li>- Work Fri, Sat, Sun only</li>
                  <li>- Hourly rate: EUR {profile?.hourly_rate?.toFixed(2) || "13.00"}</li>
                  <li>- Hours reset every Friday at midnight</li>
                  <li>- Auto-offline at 20h limit</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          isProcessing={qrProcessing}
        />
      )}
    </div>
  );
}
