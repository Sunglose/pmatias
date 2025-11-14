import { useState, useRef } from "react";

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef();

  async function fetchSuggestions(query) {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/address/nominatim?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    setSuggestions(data);
  }

  function onInputChange(value) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(value), 400);
  }

  return { suggestions, onInputChange, setSuggestions };
}