import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API } from "../App";
import axios from "axios";
import { Phone, MessageCircle, MapPin, Bike, Navigation } from "lucide-react";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const riderIcon = new L.DivIcon({
  html: `<div style="background:#D97746;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const deliveryIcon = new L.DivIcon({
  html: `<div style="background:#1E3F20;border:3px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const restaurantIcon = new L.DivIcon({
  html: `<div style="background:#8B5E3C;border:3px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function DeliveryMap({ order, variant = "customer" }) {
  const [tracking, setTracking] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!order?.id || order.status === "delivered" || order.status === "cancelled") return;

    const fetchTracking = async () => {
      try {
        const res = await axios.get(`${API}/orders/${order.id}/tracking`);
        setTracking(res.data);
      } catch {}
    };

    fetchTracking();
    intervalRef.current = setInterval(fetchTracking, 3000);
    return () => clearInterval(intervalRef.current);
  }, [order?.id, order?.status]);

  const data = tracking || order;
  if (!data) return null;

  const riderPos = data.rider_lat && data.rider_lng ? [data.rider_lat, data.rider_lng] : null;
  const deliveryPos = [data.delivery_lat || 53.3458, data.delivery_lng || -6.2575];
  const restaurantPos = [data.restaurant_lat || 53.3498, data.restaurant_lng || -6.2603];
  const mapCenter = riderPos || restaurantPos;
  const isPickedUp = data.status === "picked_up";
  const isDelivered = data.status === "delivered";

  return (
    <div className="rounded-xl overflow-hidden border border-[#E5E1D8]" data-testid="delivery-map">
      {/* Map */}
      <div className="h-[280px] relative">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: "100%", width: "100%", zIndex: 1 }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Restaurant marker */}
          <Marker position={restaurantPos} icon={restaurantIcon}>
            <Popup>{data.restaurant_name || "Restaurant"}</Popup>
          </Marker>

          {/* Delivery address marker */}
          <Marker position={deliveryPos} icon={deliveryIcon}>
            <Popup>Delivery: {data.delivery_address}</Popup>
          </Marker>

          {/* Rider marker (only when picked up) */}
          {riderPos && isPickedUp && (
            <Marker position={riderPos} icon={riderIcon}>
              <Popup>{data.rider_name || "Rider"} is on the way!</Popup>
            </Marker>
          )}

          {/* Route line */}
          {riderPos && isPickedUp && (
            <Polyline
              positions={[riderPos, deliveryPos]}
              color="#D97746"
              weight={3}
              dashArray="8,8"
              opacity={0.7}
            />
          )}

          <Polyline
            positions={[restaurantPos, deliveryPos]}
            color="#1E3F20"
            weight={2}
            opacity={0.3}
          />
        </MapContainer>

        {/* Progress overlay */}
        {isPickedUp && data.delivery_progress && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000]">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-[#D97746]" />
                <span className="text-sm font-semibold">{data.rider_name || "Rider"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-[#D97746]" />
                <span className="text-sm font-bold text-[#D97746]">{data.delivery_progress?.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Section */}
      {isPickedUp && (
        <div className="bg-white p-4 border-t border-[#E5E1D8]" data-testid="contact-section">
          {variant === "rider" && data.customer_phone && (
            <div className="space-y-2">
              <p className="text-xs text-[#5C635A] font-medium uppercase tracking-wider">Contact Customer</p>
              <div className="flex gap-2">
                <a
                  href={`tel:${data.customer_phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1E3F20] text-white rounded-xl font-semibold text-sm hover:bg-[#163018] transition-colors active:scale-95"
                  data-testid="call-customer-btn"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`https://wa.me/${data.customer_phone.replace(/[\s\-\(\)]/g, '').replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors active:scale-95"
                  data-testid="whatsapp-customer-btn"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
              <p className="text-xs text-[#5C635A] text-center">{data.customer_phone}</p>
            </div>
          )}

          {variant === "customer" && data.rider_name && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D97746]/10 rounded-full flex items-center justify-center">
                  <Bike className="w-5 h-5 text-[#D97746]" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{data.rider_name}</p>
                  <p className="text-xs text-[#5C635A]">Your rider is on the way</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D97746]" />
                <span className="text-sm font-semibold text-[#D97746]">
                  {data.delivery_progress ? `${data.delivery_progress?.toFixed(0)}% there` : "En route"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
