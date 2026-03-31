import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Circle, Marker } from "@react-google-maps/api";
import { Power, MapPin, ChevronUp, Zap, Shield, ChevronRight } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const libraries = ["places"];

// Dublin areas with busy status
const DUBLIN_ZONES = [
  { id: "city-center", name: "Dublin City Centre", lat: 53.3498, lng: -6.2603, radius: 2000, busy: "busy" },
  { id: "ballyfermot", name: "Ballyfermot", lat: 53.3428, lng: -6.3544, radius: 1500, busy: "not_busy" },
  { id: "tallaght", name: "Tallaght", lat: 53.2876, lng: -6.3739, radius: 2000, busy: "not_busy" },
  { id: "clondalkin", name: "Clondalkin", lat: 53.3205, lng: -6.3947, radius: 1500, busy: "not_busy" },
  { id: "phoenix-park", name: "Phoenix Park", lat: 53.3559, lng: -6.3298, radius: 1800, busy: "not_busy" },
  { id: "drumcondra", name: "Drumcondra", lat: 53.3701, lng: -6.2589, radius: 1200, busy: "moderate" },
  { id: "rathmines", name: "Rathmines", lat: 53.3225, lng: -6.2631, radius: 1200, busy: "busy" },
  { id: "dun-laoghaire", name: "Dún Laoghaire", lat: 53.2946, lng: -6.1344, radius: 1800, busy: "moderate" },
  { id: "howth", name: "Howth", lat: 53.3871, lng: -6.0654, radius: 1500, busy: "not_busy" },
  { id: "swords", name: "Swords", lat: 53.4597, lng: -6.2181, radius: 2000, busy: "moderate" },
];

// Fee boosts
const FEE_BOOSTS = [
  { time: "12:00 - 14:00", bonus: "+€1.50", area: "City Centre" },
  { time: "18:00 - 21:00", bonus: "+€2.00", area: "All Areas" },
  { time: "Sat 19:00 - 22:00", bonus: "+€2.50", area: "Rathmines" },
];

// Dark map style
const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64779e" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283d6a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
  { featureType: "poi", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#023e58" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3C7680" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2c6675" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#b0d5ce" }] },
  { featureType: "road.highway", elementType: "labels.text.stroke", stylers: [{ color: "#023e58" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
  { featureType: "transit", elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { featureType: "transit.line", elementType: "geometry.fill", stylers: [{ color: "#283d6a" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#3a4762" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: darkMapStyles,
};

// Rider marker
const createRiderIcon = () => ({
  url: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#00CCBC" stroke="white" stroke-width="2"/>
    </svg>
  `),
  scaledSize: { width: 24, height: 24 },
  anchor: { x: 12, y: 12 },
});

export default function DeliverooStyleMap({ 
  riderName = "Rider",
  isOnline = false,
  onToggleOnline,
  onChangeArea,
  currentArea = "Dublin City Centre"
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [riderPosition, setRiderPosition] = useState({ lat: 53.3498, lng: -6.2603 });
  const [showBottomSheet, setShowBottomSheet] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
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

  const getBusyColor = (busy) => {
    switch (busy) {
      case "busy": return { fill: "#FF6B6B", stroke: "#FF4444", opacity: 0.3 };
      case "moderate": return { fill: "#FFB347", stroke: "#FFA500", opacity: 0.25 };
      case "not_busy": return { fill: "#9B59B6", stroke: "#8E44AD", opacity: 0.2 };
      default: return { fill: "#9B59B6", stroke: "#8E44AD", opacity: 0.2 };
    }
  };

  const getBusyLabel = (busy) => {
    switch (busy) {
      case "busy": return "Busy";
      case "moderate": return "Moderate";
      case "not_busy": return "Not busy";
      default: return "Not busy";
    }
  };

  if (loadError) {
    return <div className="h-screen bg-[#1d2c4d] flex items-center justify-center text-white">Erro ao carregar mapa</div>;
  }

  if (!isLoaded) {
    return <div className="h-screen bg-[#1d2c4d] flex items-center justify-center text-white animate-pulse">Carregando...</div>;
  }

  return (
    <div className="relative h-screen w-full bg-[#1d2c4d]" data-testid="deliveroo-style-map">
      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        options={mapOptions}
        onLoad={onMapLoad}
        center={riderPosition}
        zoom={12}
      >
        {/* Heat Zones */}
        {DUBLIN_ZONES.map((zone) => {
          const colors = getBusyColor(zone.busy);
          return (
            <Circle
              key={zone.id}
              center={{ lat: zone.lat, lng: zone.lng }}
              radius={zone.radius}
              options={{
                strokeColor: colors.stroke,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: colors.fill,
                fillOpacity: colors.opacity,
              }}
              onClick={() => setSelectedArea(zone)}
            />
          );
        })}

        {/* Busy Labels */}
        {DUBLIN_ZONES.map((zone) => (
          <Marker
            key={`label-${zone.id}`}
            position={{ lat: zone.lat, lng: zone.lng }}
            icon={{
              url: "data:image/svg+xml," + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="28" viewBox="0 0 80 28">
                  <rect x="0" y="0" width="80" height="28" rx="14" fill="#1a1a2e" opacity="0.9"/>
                  <text x="40" y="18" text-anchor="middle" font-family="Arial" font-size="11" fill="white">${getBusyLabel(zone.busy)}</text>
                </svg>
              `),
              scaledSize: { width: 80, height: 28 },
              anchor: { x: 40, y: 14 },
            }}
            onClick={() => setSelectedArea(zone)}
          />
        ))}

        {/* Rider Position */}
        <Marker
          position={riderPosition}
          icon={createRiderIcon()}
          zIndex={1000}
        />
      </GoogleMap>

      {/* Menu Button */}
      <button className="absolute top-4 left-4 w-12 h-12 bg-[#1a1a2e] rounded-full flex items-center justify-center shadow-lg z-10">
        <div className="space-y-1">
          <div className="w-5 h-0.5 bg-[#00CCBC]"></div>
          <div className="w-5 h-0.5 bg-[#00CCBC]"></div>
          <div className="w-5 h-0.5 bg-[#00CCBC]"></div>
        </div>
      </button>

      {/* Bottom Sheet */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-3xl transition-transform duration-300 z-20 ${
          showBottomSheet ? "translate-y-0" : "translate-y-[calc(100%-60px)]"
        }`}
      >
        {/* Handle */}
        <button 
          onClick={() => setShowBottomSheet(!showBottomSheet)}
          className="w-full py-3 flex justify-center"
        >
          <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
        </button>

        {/* Content */}
        <div className="px-5 pb-6">
          {/* Ready to ride */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-bold">Ready to ride, {riderName}?</h2>
              <button 
                onClick={() => setShowAreaPicker(true)}
                className="text-[#00CCBC] text-sm font-medium"
              >
                Change area
              </button>
            </div>
            <button
              onClick={onToggleOnline}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                isOnline 
                  ? "bg-red-500 text-white" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
              data-testid="go-online-btn"
            >
              {isOnline ? "Go offline" : "Go online"}
            </button>
          </div>

          {/* Verify Identity */}
          <button className="w-full flex items-center justify-between py-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2d2d44] rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#00CCBC]" />
              </div>
              <span className="text-white font-medium">Verify your identity</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#00CCBC]" />
          </button>

          {/* Fee Boosts */}
          <div className="mt-2 border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">Upcoming fee boosts</span>
            </div>
            <div className="space-y-2">
              {FEE_BOOSTS.map((boost, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#2d2d44] rounded-lg">
                  <div>
                    <p className="text-white text-sm font-medium">{boost.time}</p>
                    <p className="text-gray-400 text-xs">{boost.area}</p>
                  </div>
                  <span className="text-[#00CCBC] font-bold">{boost.bonus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Area Picker Modal */}
      {showAreaPicker && (
        <div className="absolute inset-0 bg-black/80 z-30 flex items-end">
          <div className="w-full bg-[#1a1a2e] rounded-t-3xl max-h-[70vh] overflow-hidden">
            <div className="p-5 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white text-lg font-bold">Select Area</h3>
              <button 
                onClick={() => setShowAreaPicker(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {DUBLIN_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    onChangeArea?.(zone);
                    setShowAreaPicker(false);
                    if (mapRef.current) {
                      mapRef.current.panTo({ lat: zone.lat, lng: zone.lng });
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 border-b border-gray-800 hover:bg-[#2d2d44] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#00CCBC]" />
                    <span className="text-white">{zone.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    zone.busy === "busy" ? "bg-red-500/20 text-red-400" :
                    zone.busy === "moderate" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-purple-500/20 text-purple-400"
                  }`}>
                    {getBusyLabel(zone.busy)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Area Info */}
      {selectedArea && !showAreaPicker && (
        <div className="absolute top-20 left-4 right-4 bg-[#1a1a2e] rounded-xl p-4 shadow-xl z-10">
          <button 
            onClick={() => setSelectedArea(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
          <h3 className="text-white font-bold text-lg">{selectedArea.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-sm px-3 py-1 rounded-full ${
              selectedArea.busy === "busy" ? "bg-red-500/20 text-red-400" :
              selectedArea.busy === "moderate" ? "bg-yellow-500/20 text-yellow-400" :
              "bg-purple-500/20 text-purple-400"
            }`}>
              {getBusyLabel(selectedArea.busy)}
            </span>
            <span className="text-gray-400 text-sm">
              {selectedArea.busy === "busy" ? "High demand now" : 
               selectedArea.busy === "moderate" ? "Moderate orders" : 
               "Low demand"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
