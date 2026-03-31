import React, { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import { Star, Clock, MapPin, Navigation, Phone, ExternalLink } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const libraries = ["places"];

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
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};

// Custom marker for rider
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

// Restaurant marker based on rating
const createRestaurantIcon = (rating) => {
  const color = rating >= 4.5 ? "#1E3F20" : rating >= 4.0 ? "#D97746" : "#5C635A";
  return {
    url: "data:image/svg+xml," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="18" y="23" text-anchor="middle" font-size="14">🍽</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  };
};

export default function RealRestaurantsMap({ center, radius = 2000, onSelectRestaurant }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [restaurants, setRestaurants] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riderPosition, setRiderPosition] = useState(center || { lat: 53.3498, lng: -6.2603 });
  const mapRef = useRef(null);
  const placesServiceRef = useRef(null);

  // Get rider's real position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setRiderPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Keep default Dublin center
      );
    }
  }, []);

  // Search for nearby restaurants
  const searchNearbyRestaurants = useCallback(() => {
    if (!placesServiceRef.current || !riderPosition) return;

    setLoading(true);
    const request = {
      location: riderPosition,
      radius: radius,
      type: "restaurant",
    };

    placesServiceRef.current.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Sort by rating and take top 20
        const sortedResults = results
          .filter(r => r.rating && r.rating >= 3.5)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 20);
        setRestaurants(sortedResults);
      }
      setLoading(false);
    });
  }, [riderPosition, radius]);

  // Get place details
  const getPlaceDetails = useCallback((placeId) => {
    if (!placesServiceRef.current) return;

    const request = {
      placeId: placeId,
      fields: [
        "name", "formatted_address", "formatted_phone_number", "website",
        "opening_hours", "photos", "rating", "user_ratings_total", "price_level",
        "reviews", "geometry"
      ],
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setPlaceDetails(place);
      }
    });
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    searchNearbyRestaurants();
  }, [searchNearbyRestaurants]);

  const handleMarkerClick = (place) => {
    setSelectedPlace(place);
    getPlaceDetails(place.place_id);
  };

  const getPriceLevel = (level) => {
    if (!level) return "";
    return "€".repeat(level);
  };

  const getPhotoUrl = (photos, maxWidth = 400) => {
    if (photos && photos.length > 0) {
      return photos[0].getUrl({ maxWidth });
    }
    return null;
  };

  if (loadError) {
    return <div className="h-[400px] bg-[#F3EFE9] rounded-xl flex items-center justify-center">
      <p className="text-[#5C635A]">Erro ao carregar o mapa</p>
    </div>;
  }

  if (!isLoaded) {
    return <div className="h-[400px] bg-[#F3EFE9] rounded-xl animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-[#D5CFC5]" />
    </div>;
  }

  return (
    <div className="rounded-xl overflow-hidden" data-testid="real-restaurants-map">
      {/* Map */}
      <div style={{ height: "400px" }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          onLoad={onMapLoad}
          center={riderPosition}
          zoom={14}
        >
          {/* Rider Position */}
          <Marker
            position={riderPosition}
            icon={createRiderIcon()}
            title="Sua localização"
            zIndex={1000}
          />

          {/* Restaurant Markers */}
          {restaurants.map((place) => (
            <Marker
              key={place.place_id}
              position={place.geometry.location}
              icon={createRestaurantIcon(place.rating)}
              title={place.name}
              onClick={() => handleMarkerClick(place)}
            />
          ))}

          {/* Info Window */}
          {selectedPlace && placeDetails && (
            <InfoWindow
              position={selectedPlace.geometry.location}
              onCloseClick={() => { setSelectedPlace(null); setPlaceDetails(null); }}
            >
              <div style={{ maxWidth: "280px", padding: "8px" }}>
                {/* Photo */}
                {getPhotoUrl(placeDetails.photos) && (
                  <img
                    src={getPhotoUrl(placeDetails.photos)}
                    alt={placeDetails.name}
                    style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }}
                  />
                )}
                
                {/* Name & Rating */}
                <h3 style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
                  {placeDetails.name}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "#D97746", fontWeight: "bold" }}>
                    ⭐ {placeDetails.rating?.toFixed(1)}
                  </span>
                  <span style={{ color: "#666", fontSize: "12px" }}>
                    ({placeDetails.user_ratings_total} avaliações)
                  </span>
                  {placeDetails.price_level && (
                    <span style={{ color: "#1E3F20", fontWeight: "bold" }}>
                      {getPriceLevel(placeDetails.price_level)}
                    </span>
                  )}
                </div>

                {/* Address */}
                <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                  📍 {placeDetails.formatted_address}
                </p>

                {/* Opening Hours */}
                {placeDetails.opening_hours && (
                  <p style={{ fontSize: "12px", color: placeDetails.opening_hours.isOpen() ? "#1E3F20" : "#D97746", marginBottom: "8px" }}>
                    🕐 {placeDetails.opening_hours.isOpen() ? "Aberto agora" : "Fechado"}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {placeDetails.formatted_phone_number && (
                    <a
                      href={`tel:${placeDetails.formatted_phone_number}`}
                      style={{ flex: 1, padding: "8px", background: "#1E3F20", color: "white", borderRadius: "6px", textAlign: "center", fontSize: "12px", textDecoration: "none" }}
                    >
                      📞 Ligar
                    </a>
                  )}
                  {placeDetails.website && (
                    <a
                      href={placeDetails.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, padding: "8px", background: "#D97746", color: "white", borderRadius: "6px", textAlign: "center", fontSize: "12px", textDecoration: "none" }}
                    >
                      🌐 Site
                    </a>
                  )}
                </div>

                {/* Select Button */}
                {onSelectRestaurant && (
                  <button
                    onClick={() => onSelectRestaurant(placeDetails)}
                    style={{ width: "100%", marginTop: "8px", padding: "10px", background: "#E5F943", color: "#1A1D1A", borderRadius: "6px", fontWeight: "bold", border: "none", cursor: "pointer" }}
                  >
                    Adicionar ao App
                  </button>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
