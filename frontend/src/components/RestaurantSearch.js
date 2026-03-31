import React, { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { Search, Star, MapPin, Clock, X, Loader2, Filter } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const libraries = ["places"];

const CUISINE_FILTERS = [
  { key: "all", label: "Todos", icon: "🍽" },
  { key: "pizza", label: "Pizza", icon: "🍕" },
  { key: "burger", label: "Burger", icon: "🍔" },
  { key: "sushi", label: "Sushi", icon: "🍣" },
  { key: "chinese", label: "Chinês", icon: "🥡" },
  { key: "indian", label: "Indiano", icon: "🍛" },
  { key: "mexican", label: "Mexicano", icon: "🌮" },
  { key: "cafe", label: "Café", icon: "☕" },
];

export default function RestaurantSearch({ 
  location = { lat: 53.3498, lng: -6.2603 }, // Dublin default
  radius = 3000,
  onSelectRestaurant 
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userLocation, setUserLocation] = useState(location);
  const placesServiceRef = useRef(null);

  // Get user's real location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // Keep default
      );
    }
  }, []);

  // Initialize Places Service
  useEffect(() => {
    if (isLoaded && window.google && !placesServiceRef.current) {
      const dummyDiv = document.createElement("div");
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  // Search restaurants
  const searchRestaurants = useCallback((query = "", cuisineType = "all") => {
    if (!placesServiceRef.current) return;

    setLoading(true);
    
    const searchText = cuisineType !== "all" 
      ? `${cuisineType} restaurant ${query}`.trim()
      : query || "restaurant";

    const request = {
      location: userLocation,
      radius: radius,
      type: "restaurant",
      keyword: searchText,
    };

    placesServiceRef.current.nearbySearch(request, (results, status) => {
      setLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const sortedResults = results
          .filter(r => r.rating && r.rating >= 3.0)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setRestaurants(sortedResults);
      } else {
        setRestaurants([]);
      }
    });
  }, [userLocation, radius]);

  // Initial load
  useEffect(() => {
    if (isLoaded && placesServiceRef.current) {
      searchRestaurants();
    }
  }, [isLoaded, searchRestaurants]);

  const handleSearch = (e) => {
    e.preventDefault();
    searchRestaurants(searchQuery, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    searchRestaurants(searchQuery, filter);
  };

  const getPhotoUrl = (photos, maxWidth = 200) => {
    if (photos && photos.length > 0) {
      return photos[0].getUrl({ maxWidth });
    }
    return null;
  };

  const getPriceLevel = (level) => {
    if (!level) return "";
    return "€".repeat(level);
  };

  const handleSelectRestaurant = (place) => {
    // Get full details
    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: place.place_id,
          fields: ["name", "formatted_address", "formatted_phone_number", "website", "opening_hours", "photos", "rating", "user_ratings_total", "price_level", "geometry"],
        },
        (details, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            onSelectRestaurant?.({
              ...place,
              ...details,
              lat: details.geometry?.location?.lat(),
              lng: details.geometry?.location?.lng(),
            });
          }
        }
      );
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-8 h-8 text-[#D97746] animate-spin mx-auto" />
        <p className="text-[#5C635A] mt-2">Carregando busca...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] overflow-hidden" data-testid="restaurant-search">
      {/* Search Header */}
      <div className="p-4 border-b border-[#E5E1D8] bg-[#FAF9F6]">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C635A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar restaurantes, pratos..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-2 focus:ring-[#D97746]/20 outline-none"
            data-testid="restaurant-search-input"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D97746] animate-spin" />
          )}
        </form>

        {/* Cuisine Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
          {CUISINE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === filter.key
                  ? "bg-[#1E3F20] text-white"
                  : "bg-white border border-[#E5E1D8] text-[#5C635A] hover:border-[#D97746]"
              }`}
              data-testid={`filter-${filter.key}`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[500px] overflow-y-auto">
        {restaurants.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 text-[#D5CFC5] mx-auto mb-3" />
            <p className="text-[#5C635A]">Nenhum restaurante encontrado</p>
            <p className="text-sm text-[#5C635A]/70 mt-1">Tente outra busca ou filtro</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E1D8]">
            {restaurants.map((place) => (
              <div
                key={place.place_id}
                onClick={() => handleSelectRestaurant(place)}
                className="flex gap-4 p-4 hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                data-testid={`search-result-${place.place_id}`}
              >
                {/* Photo */}
                {getPhotoUrl(place.photos) ? (
                  <img
                    src={getPhotoUrl(place.photos)}
                    alt={place.name}
                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-[#F3EFE9] flex items-center justify-center text-3xl flex-shrink-0">
                    🍽
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1A1D1A] truncate">{place.name}</h3>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-sm font-bold text-[#D97746]">
                      <Star className="w-4 h-4 fill-current" />
                      {place.rating?.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#5C635A]">
                      ({place.user_ratings_total})
                    </span>
                    {place.price_level && (
                      <span className="text-sm font-bold text-[#1E3F20]">
                        {getPriceLevel(place.price_level)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1 text-xs text-[#5C635A]">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{place.vicinity}</span>
                  </div>

                  {place.opening_hours && (
                    <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                      place.opening_hours.isOpen?.() ? "text-green-600" : "text-[#D97746]"
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{place.opening_hours.isOpen?.() ? "Aberto agora" : "Fechado"}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Attribution */}
      <div className="px-4 py-2 bg-[#F3EFE9] border-t border-[#E5E1D8] flex items-center justify-end gap-1">
        <span className="text-xs text-[#5C635A]">powered by</span>
        <img 
          src="https://developers.google.com/static/maps/documentation/images/google_on_white.png" 
          alt="Google" 
          className="h-4"
        />
      </div>
    </div>
  );
}
