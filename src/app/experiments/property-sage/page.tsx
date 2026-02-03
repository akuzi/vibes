"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
import type { FeatureCollection } from "geojson";
import {
  priceBrackets,
  formatPrice,
  createFillColorExpression,
} from "@/lib/property-sage/colors";

import "mapbox-gl/dist/mapbox-gl.css";

export interface SuburbProperties {
  name: string;
  postcode?: string;
  median_price?: number;
  price_1bed?: number;
  price_2bed?: number;
  price_3bed?: number;
  price_4bed?: number;
  price_5bed?: number;
  price_change_1yr?: number;
  avg_days_on_market?: number;
}

export type BedroomFilter = "all" | "1" | "2" | "3" | "4" | "5+";
export type OverlayType = "price" | "rental" | "yield" | "growth" | "vacancy";

const bedroomOptions: { value: BedroomFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1", label: "1 Bed" },
  { value: "2", label: "2 Bed" },
  { value: "3", label: "3 Bed" },
  { value: "4", label: "4 Bed" },
  { value: "5+", label: "5+ Bed" },
];

const overlayOptions: { value: OverlayType; label: string }[] = [
  { value: "price", label: "Sale Price" },
  { value: "rental", label: "Weekly Rent" },
  { value: "yield", label: "Rental Yield" },
  { value: "growth", label: "Price Growth" },
  { value: "vacancy", label: "Vacancy Rate" },
];

const getPriceField = (overlay: OverlayType, bedroom: BedroomFilter): string => {
  if (overlay === "rental") {
    switch (bedroom) {
      case "1": return "rent_1bed";
      case "2": return "rent_2bed";
      case "3": return "rent_3bed";
      case "4": return "rent_4bed";
      case "5+": return "rent_5bed";
      default: return "rent_all";
    }
  }
  if (overlay === "yield") return "rental_yield";
  if (overlay === "growth") return "price_change_1yr";
  if (overlay === "vacancy") return "vacancy_rate";
  // Default: price
  switch (bedroom) {
    case "1": return "price_1bed";
    case "2": return "price_2bed";
    case "3": return "price_3bed";
    case "4": return "price_4bed";
    case "5+": return "price_5bed";
    default: return "median_price";
  }
};

// Australia center coordinates
const AUSTRALIA_CENTER: [number, number] = [133.7751, -25.2744];
const DEFAULT_ZOOM = 4;

export default function PropertySageExperiment() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const [hoveredSuburb, setHoveredSuburb] = useState<SuburbProperties | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbProperties | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [suburbData, setSuburbData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bedroomFilter, setBedroomFilter] = useState<BedroomFilter>("all");
  const [overlayType, setOverlayType] = useState<OverlayType>("price");

  // Fetch suburb data from API
  useEffect(() => {
    async function fetchSuburbs() {
      try {
        setLoading(true);
        const response = await fetch("/api/property-sage/suburbs");
        if (!response.ok) {
          throw new Error("Failed to fetch suburb data");
        }
        const data = await response.json();
        setSuburbData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching suburbs:", err);
        setError("Failed to load suburb boundaries");
      } finally {
        setLoading(false);
      }
    }

    fetchSuburbs();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found. Please set NEXT_PUBLIC_MAPBOX_TOKEN in your .env file");
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: AUSTRALIA_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Create popup instance
    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Track zoom level
    map.current.on("zoom", () => {
      if (map.current) {
        setZoomLevel(Math.round(map.current.getZoom() * 10) / 10);
      }
    });

    // Cleanup
    return () => {
      if (popup.current) {
        popup.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add suburb layers when map is loaded and data is available
  useEffect(() => {
    if (!map.current || !mapLoaded || !suburbData || suburbData.features.length === 0) return;

    // Remove existing layers and source if they exist
    if (map.current.getLayer("suburbs-highlight")) {
      map.current.removeLayer("suburbs-highlight");
    }
    if (map.current.getLayer("suburbs-outline")) {
      map.current.removeLayer("suburbs-outline");
    }
    if (map.current.getLayer("suburbs-fill")) {
      map.current.removeLayer("suburbs-fill");
    }
    if (map.current.getSource("suburbs")) {
      map.current.removeSource("suburbs");
    }

    // Add suburb data source
    map.current.addSource("suburbs", {
      type: "geojson",
      data: suburbData,
    });

    // Add fill layer for choropleth
    const priceField = getPriceField(bedroomFilter);
    map.current.addLayer({
      id: "suburbs-fill",
      type: "fill",
      source: "suburbs",
      paint: {
        "fill-color": createFillColorExpression(priceField),
        "fill-opacity": 0.6,
      },
    });

    // Add outline layer
    map.current.addLayer({
      id: "suburbs-outline",
      type: "line",
      source: "suburbs",
      paint: {
        "line-color": "#374151",
        "line-width": 1,
      },
    });

    // Add hover highlight layer
    map.current.addLayer({
      id: "suburbs-highlight",
      type: "line",
      source: "suburbs",
      paint: {
        "line-color": "#1f2937",
        "line-width": 3,
      },
      filter: ["==", ["get", "name"], ""],
    });
  }, [mapLoaded, suburbData, bedroomFilter]);

  // Track current hovered suburb name to avoid unnecessary updates
  const hoveredSuburbName = useRef<string | null>(null);

  // Get the displayed price based on bedroom filter
  const getDisplayPrice = useCallback((properties: SuburbProperties): number | null => {
    switch (bedroomFilter) {
      case "1": return properties.price_1bed ?? null;
      case "2": return properties.price_2bed ?? null;
      case "3": return properties.price_3bed ?? null;
      case "4": return properties.price_4bed ?? null;
      case "5+": return properties.price_5bed ?? null;
      default: return properties.median_price ?? null;
    }
  }, [bedroomFilter]);

  // Handle hover events
  const handleMouseMove = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current || !e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties as SuburbProperties;
    const displayPrice = getDisplayPrice(properties);

    // Only update if we're hovering over a different suburb
    if (hoveredSuburbName.current === properties.name) {
      // Just update popup position
      if (popup.current) {
        popup.current.setLngLat(e.lngLat);
      }
      return;
    }

    hoveredSuburbName.current = properties.name;
    map.current.getCanvas().style.cursor = "pointer";
    setHoveredSuburb(properties);

    // Update highlight filter
    if (map.current.getLayer("suburbs-highlight")) {
      map.current.setFilter("suburbs-highlight", ["==", ["get", "name"], properties.name]);
    }

    // Show popup
    if (popup.current) {
      const bedroomLabel = bedroomFilter === "all" ? "" : ` (${bedroomFilter} bed)`;
      const priceDisplay = displayPrice !== null && displayPrice !== undefined
        ? `${formatPrice(displayPrice)}${bedroomLabel}`
        : "No data available";
      popup.current
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="font-sans">
            <strong class="text-gray-900">${properties.name}</strong>
            <div class="text-gray-600 text-sm">${priceDisplay}</div>
          </div>`
        )
        .addTo(map.current);
    }
  }, [bedroomFilter, getDisplayPrice]);

  const handleMouseLeave = useCallback(() => {
    if (!map.current) return;

    hoveredSuburbName.current = null;
    map.current.getCanvas().style.cursor = "";
    setHoveredSuburb(null);

    // Clear highlight
    if (map.current.getLayer("suburbs-highlight")) {
      map.current.setFilter("suburbs-highlight", ["==", ["get", "name"], ""]);
    }

    // Remove popup
    if (popup.current) {
      popup.current.remove();
    }
  }, []);

  const handleClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!e.features || e.features.length === 0) return;

    const properties = e.features[0].properties as SuburbProperties;
    setSelectedSuburb(properties);
  }, []);

  // Set up event listeners after map loads and data is available
  useEffect(() => {
    if (!map.current || !mapLoaded || !suburbData || suburbData.features.length === 0) return;

    map.current.on("mousemove", "suburbs-fill", handleMouseMove);
    map.current.on("mouseleave", "suburbs-fill", handleMouseLeave);
    map.current.on("click", "suburbs-fill", handleClick);

    return () => {
      if (!map.current) return;
      map.current.off("mousemove", "suburbs-fill", handleMouseMove);
      map.current.off("mouseleave", "suburbs-fill", handleMouseLeave);
      map.current.off("click", "suburbs-fill", handleClick);
    };
  }, [mapLoaded, suburbData, handleMouseMove, handleMouseLeave, handleClick]);

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-green-700">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-green-400 hover:text-green-300 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
        </div>
        <h1 className="text-2xl font-mono text-green-400">Property Sage</h1>
        <div className="w-10"></div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }} />

        {/* Loading indicator */}
        {loading && (
          <div className="absolute top-4 right-4 bg-gray-900 border border-green-700 rounded-lg px-4 py-2 text-green-400 font-mono text-sm z-10">
            Loading suburb boundaries...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-4 right-4 bg-gray-900 border border-red-500 rounded-lg px-4 py-2 text-red-400 font-mono text-sm z-10">
            {error}
          </div>
        )}

        {/* No token warning */}
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-md text-center">
              <h2 className="text-red-400 font-mono text-xl mb-4">Mapbox Token Required</h2>
              <p className="text-gray-300 mb-4">
                Please add your Mapbox access token to the <code className="bg-gray-800 px-1 rounded">.env</code> file:
              </p>
              <code className="block bg-gray-800 p-3 rounded text-green-400 text-sm">
                NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
              </code>
              <p className="text-gray-400 text-sm mt-4">
                Get a free token at{" "}
                <a
                  href="https://mapbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-gray-900 border border-green-700 rounded-lg p-3 text-green-400 font-mono text-xs">
          <h3 className="text-sm font-bold text-yellow-400 mb-2">Median House Price</h3>
          <div className="space-y-1">
            {priceBrackets.map((bracket, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: bracket.color }}
                />
                <span>{bracket.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bedroom Filter */}
        <div className="absolute top-4 right-4 bg-gray-900 border border-green-700 rounded-lg p-3 text-green-400 font-mono text-xs z-10">
          <label className="block text-sm font-bold text-yellow-400 mb-2">
            Bedrooms
          </label>
          <div className="flex flex-wrap gap-1">
            {bedroomOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBedroomFilter(option.value)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  bedroomFilter === option.value
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Control */}
        <div className="absolute bottom-4 right-4 bg-gray-900 border border-green-700 rounded-lg overflow-hidden font-mono text-xs">
          {/* Zoom In Button */}
          <button
            onClick={() => {
              if (map.current) {
                map.current.zoomIn();
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-green-400 hover:bg-gray-800 border-b border-green-700 transition-colors"
            aria-label="Zoom in"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          {/* Zoom Level Display */}
          <div className="w-10 h-8 flex items-center justify-center text-green-400 border-b border-green-700">
            <span className="text-yellow-400 text-xs">{zoomLevel.toFixed(1)}</span>
          </div>
          {/* Zoom Out Button */}
          <button
            onClick={() => {
              if (map.current) {
                map.current.zoomOut();
              }
            }}
            className="w-10 h-10 flex items-center justify-center text-green-400 hover:bg-gray-800 transition-colors"
            aria-label="Zoom out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>
        </div>

        {/* Selected Suburb Info Panel */}
        {selectedSuburb && (
          <div className="absolute top-4 left-4 bg-gray-900 border border-green-700 rounded-lg p-4 text-green-400 font-mono max-w-xs">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-yellow-400">{selectedSuburb.name}</h3>
              <button
                onClick={() => setSelectedSuburb(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {selectedSuburb.postcode && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Postcode:</span>
                  <span>{selectedSuburb.postcode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {bedroomFilter === "all" ? "Median Price:" : `${bedroomFilter} Bed Price:`}
                </span>
                <span className="text-lg font-bold">
                  {getDisplayPrice(selectedSuburb) !== null && getDisplayPrice(selectedSuburb) !== undefined
                    ? formatPrice(getDisplayPrice(selectedSuburb)!)
                    : "No data"}
                </span>
              </div>
              {selectedSuburb.price_change_1yr !== null && selectedSuburb.price_change_1yr !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">1yr Change:</span>
                  <span className={selectedSuburb.price_change_1yr >= 0 ? "text-green-400" : "text-red-400"}>
                    {selectedSuburb.price_change_1yr >= 0 ? "+" : ""}
                    {selectedSuburb.price_change_1yr}%
                  </span>
                </div>
              )}
              {selectedSuburb.avg_days_on_market !== null && selectedSuburb.avg_days_on_market !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Days on Market:</span>
                  <span>{selectedSuburb.avg_days_on_market} days</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hover indicator (bottom center) */}
        {hoveredSuburb && !selectedSuburb && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-green-700 rounded-lg px-4 py-2 text-green-400 font-mono text-sm">
            <span className="font-bold">{hoveredSuburb.name}</span>
            {getDisplayPrice(hoveredSuburb) !== null && getDisplayPrice(hoveredSuburb) !== undefined && (
              <>
                <span className="mx-2">|</span>
                <span>{formatPrice(getDisplayPrice(hoveredSuburb)!)}</span>
                {bedroomFilter !== "all" && <span className="text-gray-400 ml-1">({bedroomFilter} bed)</span>}
              </>
            )}
            {getDisplayPrice(hoveredSuburb) === null || getDisplayPrice(hoveredSuburb) === undefined ? (
              <span className="mx-2 text-gray-500">| No data</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
