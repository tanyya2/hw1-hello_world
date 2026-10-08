"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Spot } from "./geocode";
import type { Place } from "./places";

const METERS_PER_MILE = 1609.34;

// Numbered pins: outlined when not selected, filled black when selected
const PIN = "flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 text-xs font-semibold shadow";
const PIN_OFF = `${PIN} border-black bg-white text-black`;
const PIN_ON = `${PIN} border-white bg-black text-white`;

type Props = {
  center: Spot;
  radiusMiles: number;
  places: Place[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

// Leaflet touches `window`, so this component is loaded only in the browser
export default function PlaceMap({ center, radiusMiles, places, selected, onToggle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onToggleRef = useRef(onToggle);
  const meters = radiusMiles * METERS_PER_MILE;

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  // Create the map once
  useEffect(() => {
    const map = L.map(containerRef.current!, { scrollWheelZoom: false });
    // OpenStreetMap tiles (free, no key), turned grayscale to match the black-and-white design
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: "grayscale",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Zoom to the search area when it changes
  useEffect(() => {
    mapRef.current?.fitBounds(L.latLng(center.lat, center.lon).toBounds(meters * 2));
  }, [center.lat, center.lon, meters]);

  // Redraw the search area, your location and the pins
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    L.circle([center.lat, center.lon], {
      radius: meters,
      color: "#000",
      weight: 1,
      dashArray: "4 4",
      fill: false,
      interactive: false,
    }).addTo(layer);
    L.circleMarker([center.lat, center.lon], {
      radius: 6,
      color: "#fff",
      weight: 2,
      fillColor: "#000",
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer);

    places.forEach((place, i) => {
      const on = selected.has(place.id);
      // Text node, not HTML: place names come from an outside source
      const tooltip = document.createElement("span");
      tooltip.textContent = `${place.name} · ${place.miles} mi`;

      L.marker([place.lat, place.lon], {
        icon: L.divIcon({
          className: "",
          html: `<div class="${on ? PIN_ON : PIN_OFF}">${i + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        zIndexOffset: on ? 1000 : 0,
        keyboard: true,
      })
        .bindTooltip(tooltip, { direction: "top", offset: [0, -14] })
        .on("click", () => onToggleRef.current(place.id))
        .addTo(layer);
    });
  }, [center.lat, center.lon, meters, places, selected]);

  return <div ref={containerRef} className="relative z-0 h-96 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800" />;
}
