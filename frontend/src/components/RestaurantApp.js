import React, { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  Store, Package, ChefHat, DollarSign, LogOut, Plus, Trash2,
  Check, X, Clock, TrendingUp, ShoppingBag, RefreshCw, Edit3
} from "lucide-react";

export default function RestaurantApp() {
  const { user, logout } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("orders");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", category: "Main", allergens: "" });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, oRes, sRes] = await Promise.all([
        axios.get(`${API}/restaurant/my`),
        axios.get(`${API}/restaurant/orders`),
        axios.get(`${API}/restaurant/stats`)
      ]);
      setRestaurant(rRes.data);
      setOrders(oRes.data);
      setStats(sRes.data);
      if (rRes.data?.id) {
        const mRes = await axios.get(`${API}/restaurants/${rRes.data.id}/menu`);
        setMenu(mRes.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setRestaurant(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status });
      toast.success(`Order ${status}`);
      fetchData();
    } catch (err) {
      toast.error("Error updating order");
    }
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    if (!restaurant) return;
    try {
      await axios.post(`${API}/restaurants/${restaurant.id}/menu`, {
        ...newItem,
        price: parseFloat(newItem.price)
      });
      toast.success("Item added!");
      setNewItem({ name: "", description: "", price: "", category: "Main", allergens: "" });
      setShowAddItem(false);
      fetchData();
    } catch (err) {
      toast.error("Error adding item");
    }
  };

  const deleteMenuItem = async (itemId) => {
    try {
      await axios.delete(`${API}/menu-items/${itemId}`);
      toast.success("Item deleted");
      fetchData();
    } catch (err) {
      toast.error("Error deleting item");
    }
  };

  const tabs = [
    { key: "orders", icon: Package, label: "Orders" },
    { key: "menu", icon: ChefHat, label: "Menu" },
    { key: "stats", icon: TrendingUp, label: "Stats" },
  ];

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "preparing", "ready"].includes(o.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#D97746] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="restaurant-app">
      {/* Header */}
      <nav className="bg-[#1E3F20] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6" />
            <div>
              <h1 className="font-heading font-bold text-lg">{restaurant?.name || "My Restaurant"}</h1>
              <p className="text-sm text-white/70">Restaurant Dashboard</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="restaurant-logout-btn">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-[#E5E1D8] bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-[#1E3F20] text-[#1E3F20]"
                  : "border-transparent text-[#5C635A] hover:text-[#1A1D1A]"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.key === "orders" && pendingOrders.length > 0 && (
                <span className="ml-1 w-5 h-5 bg-[#D97746] text-white rounded-full text-xs flex items-center justify-center">{pendingOrders.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="animate-fade-in-up">
            {pendingOrders.length > 0 && (
              <div className="mb-8">
                <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#D97746] rounded-full pulse-dot" />
                  New Orders ({pendingOrders.length})
                </h2>
                <div className="space-y-4">
                  {pendingOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border-2 border-[#D97746]/30 p-5 animate-fade-in-up" data-testid={`pending-order-${order.id}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-heading font-bold">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-[#5C635A]">{order.customer_name} - {new Date(order.created_at).toLocaleTimeString()}</p>
                        </div>
                        <span className="font-heading font-bold text-lg text-[#D97746]">EUR {order.total?.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1 mb-4">
                        {order.items?.map((item, i) => (
                          <p key={i} className="text-sm text-[#5C635A]">{item.quantity}x {item.name}</p>
                        ))}
                      </div>
                      <p className="text-sm text-[#5C635A] mb-4"><MapPinIcon /> {order.delivery_address}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateOrderStatus(order.id, "accepted")}
                          className="flex-1 py-3 bg-[#1E3F20] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#163018] transition-colors active:scale-95"
                          data-testid={`accept-order-${order.id}`}
                        >
                          <Check className="w-5 h-5" /> Accept
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, "cancelled")}
                          className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                          data-testid={`reject-order-${order.id}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="font-heading font-bold text-xl mb-4">Active Orders</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-[#5C635A]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No active orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-[#E5E1D8] p-5" data-testid={`active-order-${order.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-heading font-bold">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-[#5C635A]">{order.items?.map(i => `${i.quantity}x ${i.name}`).join(", ")}</p>
                      </div>
                      <span className={`status-badge status-${order.status}`}>{order.status}</span>
                    </div>
                    <div className="flex gap-2">
                      {order.status === "accepted" && (
                        <button onClick={() => updateOrderStatus(order.id, "preparing")} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100" data-testid={`preparing-btn-${order.id}`}>
                          Start Preparing
                        </button>
                      )}
                      {order.status === "preparing" && (
                        <button onClick={() => updateOrderStatus(order.id, "ready")} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100" data-testid={`ready-btn-${order.id}`}>
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {orders.filter(o => o.status === "delivered").length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading font-bold text-xl mb-4 text-[#5C635A]">Completed</h2>
                <div className="space-y-3">
                  {orders.filter(o => o.status === "delivered").slice(0, 5).map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-[#E5E1D8] p-4 flex justify-between items-center opacity-70">
                      <div>
                        <p className="font-semibold text-sm">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-[#5C635A]">{order.items?.length} items</p>
                      </div>
                      <span className="font-heading font-bold text-green-600">EUR {order.restaurant_amount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === "menu" && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-xl">Menu Items ({menu.length})</h2>
              <button
                onClick={() => setShowAddItem(!showAddItem)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#D97746] text-white rounded-full font-semibold text-sm hover:bg-[#C46838] transition-colors"
                data-testid="add-menu-item-btn"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            {showAddItem && (
              <form onSubmit={addMenuItem} className="bg-white rounded-xl border border-[#E5E1D8] p-5 mb-6 space-y-3" data-testid="add-item-form">
                <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Item name" className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] focus:border-[#D97746] outline-none" required data-testid="new-item-name" />
                <input type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Description" className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] focus:border-[#D97746] outline-none" data-testid="new-item-desc" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="Price (EUR)" className="px-4 py-2.5 rounded-lg border border-[#E5E1D8] focus:border-[#D97746] outline-none" required data-testid="new-item-price" />
                  <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="px-4 py-2.5 rounded-lg border border-[#E5E1D8] focus:border-[#D97746] outline-none" data-testid="new-item-category">
                    <option>Main</option><option>Specialty</option><option>Vegan</option><option>Sides</option><option>Drinks</option><option>Desserts</option><option>Custom</option>
                  </select>
                </div>
                <input type="text" value={newItem.allergens} onChange={e => setNewItem({...newItem, allergens: e.target.value})} placeholder="Allergens (optional)" className="w-full px-4 py-2.5 rounded-lg border border-[#E5E1D8] focus:border-[#D97746] outline-none" data-testid="new-item-allergens" />
                <button type="submit" className="w-full py-3 bg-[#1E3F20] text-white rounded-lg font-bold hover:bg-[#163018]" data-testid="save-item-btn">Save Item</button>
              </form>
            )}

            <div className="space-y-3">
              {menu.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E5E1D8] p-4" data-testid={`menu-manage-${item.id}`}>
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-[#5C635A]">{item.category} {item.allergens ? `| ${item.allergens}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-heading font-bold">EUR {item.price?.toFixed(2)}</span>
                    <button onClick={() => deleteMenuItem(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" data-testid={`delete-item-${item.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="animate-fade-in-up">
            <h2 className="font-heading font-bold text-xl mb-6">Restaurant Statistics</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Orders", value: stats.total_orders || 0, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
                { label: "Today's Orders", value: stats.today_orders || 0, icon: Clock, color: "bg-orange-50 text-orange-600" },
                { label: "Delivered", value: stats.delivered || 0, icon: Check, color: "bg-green-50 text-green-600" },
                { label: "Revenue", value: `EUR ${(stats.total_revenue || 0).toFixed(2)}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E1D8] p-5" data-testid={`stat-card-${i}`}>
                  <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-[#5C635A]">{s.label}</p>
                  <p className="font-heading font-bold text-2xl">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MapPinIcon() {
  return <span className="inline-flex items-center text-[#5C635A]"><svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span>;
}
