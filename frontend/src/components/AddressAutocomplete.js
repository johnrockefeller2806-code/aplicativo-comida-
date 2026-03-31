import React, { useState, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, X, Loader2 } from "lucide-react";
import { GOOGLE_MAPS_CONFIG } from "./googleMapsConfig";

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Digite seu endereço de entrega",
  onSelect,
  className = ""
}) {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const inputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);

  useEffect(() => {
    if (isLoaded && window.google) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement("div");
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const searchPredictions = async (input) => {
    if (!autocompleteServiceRef.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    
    const request = {
      input,
      sessionToken: sessionTokenRef.current,
      componentRestrictions: { country: "ie" }, // Ireland
      types: ["address"],
    };

    autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
      setLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
        setIsOpen(true);
      } else {
        setPredictions([]);
      }
    });
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    searchPredictions(newValue);
    setSelectedPlace(null);
  };

  const handleSelectPrediction = (prediction) => {
    setInputValue(prediction.description);
    onChange?.(prediction.description);
    setIsOpen(false);
    setPredictions([]);

    // Get place details for coordinates
    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["geometry", "formatted_address", "name"],
          sessionToken: sessionTokenRef.current,
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const placeData = {
              address: place.formatted_address || prediction.description,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              placeId: prediction.place_id,
            };
            setSelectedPlace(placeData);
            onSelect?.(placeData);
            
            // Create new session token for next search
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
          }
        }
      );
    }
  };

  const clearInput = () => {
    setInputValue("");
    onChange?.("");
    setPredictions([]);
    setSelectedPlace(null);
    inputRef.current?.focus();
  };

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#E5E1D8] bg-white">
          <MapPin className="w-5 h-5 text-[#D5CFC5]" />
          <span className="text-[#5C635A]">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} data-testid="address-autocomplete">
      {/* Input */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D97746]" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 rounded-xl border border-[#E5E1D8] bg-white focus:border-[#D97746] focus:ring-2 focus:ring-[#D97746]/20 outline-none transition-all"
          data-testid="address-input"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D97746] animate-spin" />
        )}
        {inputValue && !loading && (
          <button
            onClick={clearInput}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[#F3EFE9] rounded-full transition-colors"
            data-testid="clear-address-btn"
          >
            <X className="w-4 h-4 text-[#5C635A]" />
          </button>
        )}
      </div>

      {/* Selected place confirmation */}
      {selectedPlace && (
        <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
          <MapPin className="w-4 h-4" />
          <span className="flex-1 truncate">{selectedPlace.address}</span>
          <span className="text-xs text-green-500">✓ Confirmado</span>
        </div>
      )}

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-[#E5E1D8] shadow-xl overflow-hidden" data-testid="address-predictions">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-[#F3EFE9] transition-colors text-left border-b border-[#E5E1D8] last:border-b-0"
              data-testid={`prediction-${prediction.place_id}`}
            >
              <MapPin className="w-5 h-5 text-[#D97746] mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1A1D1A] truncate">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </p>
                <p className="text-sm text-[#5C635A] truncate">
                  {prediction.structured_formatting?.secondary_text || ""}
                </p>
              </div>
            </button>
          ))}
          
          {/* Google Attribution */}
          <div className="px-4 py-2 bg-[#F3EFE9] flex items-center justify-end gap-1">
            <span className="text-xs text-[#5C635A]">powered by</span>
            <img 
              src="https://developers.google.com/static/maps/documentation/images/google_on_white.png" 
              alt="Google" 
              className="h-4"
            />
          </div>
        </div>
      )}
    </div>
  );
}
