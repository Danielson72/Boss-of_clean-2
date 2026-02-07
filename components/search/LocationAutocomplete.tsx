'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';

interface AutocompleteResult {
  zip_code: string;
  city: string;
  county: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: AutocompleteResult) => void;
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelectLocation,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/search/autocomplete?q=${encodeURIComponent(query)}&limit=8`
      );
      if (res.ok) {
        const { results } = await res.json();
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      }
    } catch {
      // Silently fail — autocomplete is a convenience feature
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (result: AutocompleteResult) => {
    onChange(`${result.city}, FL`);
    onSelectLocation(result);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="location-input" className="sr-only">
        Enter ZIP, city, or county
      </label>
      <MapPin
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id="location-input"
        type="text"
        placeholder="Enter ZIP, city, or county"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-describedby="location-help"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={isOpen ? 'location-suggestions' : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
        role="combobox"
        autoComplete="off"
      />
      <span id="location-help" className="sr-only">
        Search for cleaners by location
      </span>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="location-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {suggestions.map((result, index) => (
            <li
              key={`${result.zip_code}-${index}`}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`px-4 py-2.5 cursor-pointer text-sm ${
                index === activeIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(result);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="font-medium">{result.city}</span>
              <span className="text-gray-400">, {result.county} — </span>
              <span className="text-gray-500">{result.zip_code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
