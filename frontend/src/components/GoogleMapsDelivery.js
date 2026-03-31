import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Navigation, MapPin, Clock, Bike } from "lucide-react";
import { GOOGLE_MAPS_CONFIG } from "./googleMapsConfig";
import axios from "axios";
import { API } from "../App";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

// Custom marker icons
const createRiderIcon = () => ({
  url: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="#D97746" stroke="white" stroke-width="4"/>
      <text x="24" y="30" text-anchor="middle" font-size="20">🛵</text>
    </svg>
  `),
  scaledSize: { width: 48, height: 48 },
  anchor: { x: 24, y: 24 },
});

const createRestaurantIcon = () => ({
  url: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="#1E3F20" stroke="white" stroke-width="3"/>
      <text x="20" y="26" text-anchor="middle" font-size="16">🍽</text>
    </svg>
  `),
  scaledSize: { width: 40, height: 40 },
  anchor: { x: 20, y: 20 },
});

const createDeliveryIcon = () => ({
  url: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="#E5F943" stroke="#1E3F20" stroke-width="3"/>
      <text x="20" y="26" text-anchor="middle" font-size="16">🏠</text>
    </svg>
  `),
  scaledSize: { width: 40, height: 40 },
  anchor: { x: 20, y: 20 },
});

export default function GoogleMapsDelivery({ order, variant = "customer", fullScreen = false }) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const [directions, setDirections] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const mapRef = useRef(null);
  const directionsCalculated = useRef(false);

  const restaurantPos = {
    lat: order?.restaurant_lat || 53.3498,
    lng: order?.restaurant_lng || -6.2603,
  };

  const deliveryPos = {
    lat: order?.delivery_lat || 53.3458,
    lng: order?.delivery_lng || -6.2575,
  };

  // Initialize rider position
  useEffect(() => {
    if (order?.rider_lat && order?.rider_lng) {
      setRiderPosition({
        lat: order.rider_lat,
        lng: order.rider_lng,
      });
    } else {
      setRiderPosition(restaurantPos);
    }
  }, []);

  // Poll real-time tracking endpoint
  useEffect(() => {
    if (!order?.id || order.status !== "picked_up") return;

    const fetchTracking = async () => {
      try {
        const res = await axios.get(`${API}/orders/${order.id}/tracking`);
        const data = res.data;
        if (data.rider_lat && data.rider_lng) {
          setRiderPosition({ lat: data.rider_lat, lng: data.rider_lng });
        }
        if (data.delivery_progress !== undefined) {
          setDeliveryProgress(data.delivery_progress);
        }
      } catch {}
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 4000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status]);

  // Calculate route (once when rider position and map are loaded)
  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !window.google || !riderPosition || directionsCalculated.current) return;

    const directionsService = new window.google.maps.DirectionsService();

    try {
      const result = await directionsService.route({
        origin: riderPosition,
        destination: deliveryPos,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      setDirections(result);
      directionsCalculated.current = true;

      const leg = result.routes[0]?.legs[0];
      if (leg) {
        setEta(leg.duration?.text);
        setDistance(leg.distance?.text);
      }
    } catch (error) {
      console.error("Error calculating route:", error);
    }
  }, [isLoaded, riderPosition, deliveryPos.lat, deliveryPos.lng]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    
    // Fit bounds to show all markers
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(restaurantPos);
    bounds.extend(deliveryPos);
    if (riderPosition) {
      bounds.extend(riderPosition);
    }
    map.fitBounds(bounds, { padding: 60 });
  }, [restaurantPos, deliveryPos, riderPosition]);

  if (loadError) {
    return (
      <div className={`${fullScreen ? "h-full" : "h-[300px]"} bg-[#F3EFE9] rounded-xl flex items-center justify-center`}>
        <p className="text-[#5C635A]">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${fullScreen ? "h-full" : "h-[300px]"} bg-[#F3EFE9] rounded-xl flex items-center justify-center animate-pulse`}>
        <MapPin className="w-8 h-8 text-[#D5CFC5]" />
      </div>
    );
  }

  return (
    <div className={`${fullScreen ? "h-full flex flex-col" : ""} overflow-hidden ${fullScreen ? "" : "rounded-xl border border-[#E5E1D8]"}`} data-testid="google-maps-delivery">
      {/* ETA Header */}
      {eta && order?.status === "picked_up" && (
        <div className="bg-[#1E3F20] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D97746] rounded-full flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{order.rider_name || "Entregador"} está a caminho</p>
              <p className="text-xs text-white/70">Rastreamento em tempo real</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#E5F943]">
              <Clock className="w-4 h-4" />
              <span className="font-bold">{eta}</span>
            </div>
            <p className="text-xs text-white/60">{distance}</p>
          </div>
        </div>
      )}

      {/* Map */}
      <div style={fullScreen ? { flex: 1 } : { height: "280px" }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          onLoad={onMapLoad}
          center={riderPosition || restaurantPos}
          zoom={14}
        >
          {/* Restaurant Marker */}
          <Marker
            position={restaurantPos}
            icon={createRestaurantIcon()}
            title={order?.restaurant_name || "Restaurante"}
          />

          {/* Delivery Location Marker */}
          <Marker
            position={deliveryPos}
            icon={createDeliveryIcon()}
            title="Local de entrega"
          />

          {/* Rider Marker */}
          {riderPosition && order?.status === "picked_up" && (
            <Marker
              position={riderPosition}
              icon={createRiderIcon()}
              title={order?.rider_name || "Entregador"}
              animation={window.google?.maps?.Animation?.BOUNCE}
            />
          )}

          {/* Route */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: "#D97746",
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                },
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Legend */}
      <div className="bg-[#FAF9F6] px-4 py-2 flex items-center gap-4 text-xs border-t border-[#E5E1D8]">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🍽</span>
          <span className="text-[#5C635A]">{order?.restaurant_name || "Restaurante"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">🛵</span>
          <span className="text-[#5C635A]">{order?.rider_name || "Entregador"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">🏠</span>
          <span className="text-[#5C635A]">Entrega</span>
        </div>
      </div>
    </div>
  );
}
