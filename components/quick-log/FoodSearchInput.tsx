"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, AlertCircle, X } from "lucide-react";
import type { Food } from "@/types";

interface FoodSearchInputProps {
  onSelect: (food: Food) => void;
  /** Called whenever the typed query changes (including resets to ""). */
  onQueryChange?: (query: string) => void;
  protocolId?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function FoodSearchInput({
  onSelect,
  onQueryChange,
  protocolId,
  placeholder = "Search for a food...",
  autoFocus = false,
}: FoodSearchInputProps) {
  const [query, setQuery] = useState("");

  // Mirror query to the parent without making the effect depend on an
  // inline callback identity.
  const onQueryChangeRef = useRef(onQueryChange);
  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);
  useEffect(() => {
    onQueryChangeRef.current?.(query);
  }, [query]);
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          query: searchQuery.trim(),
          limit: "10",
        });

        if (protocolId) {
          params.append("protocolId", protocolId);
        }

        const response = await fetch(`/api/foods/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to search foods");
        }

        const data = await response.json();
        setResults(data.foods || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error("Food search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [protocolId]
  );

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for 200ms debounce
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 200);
  };

  // Handle food selection
  const handleSelect = (food: Food) => {
    onSelect(food);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Get protocol status badge
  const getProtocolBadge = (status?: string) => {
    if (!status) return null;

    const badges = {
      allowed: (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
          Allowed
        </span>
      ),
      avoid: (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
          Avoid
        </span>
      ),
      moderation: (
        <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700">
          Moderation
        </span>
      ),
      unknown: (
        <span className="rounded bg-warm-100 px-1.5 py-0.5 text-xs font-medium text-warm-700">
          Unknown
        </span>
      ),
    };

    return badges[status as keyof typeof badges] || null;
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-warm-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-warm-200 py-2 pl-10 pr-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {loading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Loader2 className="h-4 w-4 animate-spin text-warm-400" />
          </div>
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-warm-400 hover:text-warm-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-warm-200 bg-[var(--color-surface-card)] shadow-lg"
        >
          {results.map((food, index) => (
            <button
              key={food.id}
              type="button"
              onClick={() => handleSelect(food)}
              className={`w-full border-b border-warm-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                index === selectedIndex
                  ? "bg-teal-50"
                  : "hover:bg-warm-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-warm-900 text-sm">
                    {food.displayName}
                  </div>
                  <div className="text-xs text-warm-500 mt-0.5">
                    {food.categoryName}
                    {food.subcategoryName && ` • ${food.subcategoryName}`}
                  </div>
                </div>
                {protocolId && getProtocolBadge(food.protocolStatus)}
              </div>

              {/* Protocol Violations Warning */}
              {food.protocolStatus === "avoid" && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>Not allowed on your protocol</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-4 text-center text-sm text-warm-500 shadow-lg">
          No foods found for &quot;{query}&quot;
        </div>
      )}

      {/* Keyboard Hints */}
      {isOpen && results.length > 0 && (
        <div className="mt-1 text-xs text-warm-400">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      )}
    </div>
  );
}
