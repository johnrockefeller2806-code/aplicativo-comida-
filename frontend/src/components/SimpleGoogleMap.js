import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { GOOGLE_MAPS_CONFIG } from "./googleMapsConfig";

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

// Rider marker icon - Using Kangaroos logo
const createRiderIcon = () => ({
  url: "/logo.png",
  scaledSize: { width: 56, height: 56 },
  anchor: { x: 28, y: 28 },
});

export default function SimpleGoogleMap({ height = "500px" }) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const [riderPosition, setRiderPosition] = useState({ lat: 53.3498, lng: -6.2603 });
  const mapRef = useRef(null);

  // Get rider's real position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setRiderPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Keep default Dublin center
      );
    }
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  if (loadError) {
    return (
      <div style={{ height }} className="bg-[#F3EFE9] rounded-xl flex items-center justify-center">
        <p className="text-[#5C635A]">Erro ao carregar o mapa</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ height }} className="bg-[#F3EFE9] rounded-xl animate-pulse flex items-center justify-center">
        <MapPin className="w-8 h-8 text-[#D5CFC5]" />
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }} className="rounded-xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", borderRadius: "12px" }}
        options={mapOptions}
        onLoad={onMapLoad}
        center={riderPosition}
        zoom={14}
      >
        <Marker
          position={riderPosition}
          icon={createRiderIcon()}
          title="Sua localização"
        />
      </GoogleMap>
    </div>
  );
}
