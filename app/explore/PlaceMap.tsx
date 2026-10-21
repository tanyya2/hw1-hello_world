"use client";

import { useEffect, useState } from "react";
import { APIProvider, AdvancedMarker, Circle, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import type { Spot } from "./geocode";
import { METERS_PER_MILE, type Place } from "./google";
import { formatMiles } from "./nyc";

// Numbered pins matching the list
const PIN =
  "flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-ink font-serif text-sm text-card shadow";

type Props = {
  center: Spot;
  radiusMiles: number;
  places: Place[];
};

// Google's terms: places from Google must be shown on a Google map.
// The browser key only works for the map, and only on our own sites.
export default function PlaceMap({ center, radiusMiles, places }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const meters = radiusMiles * METERS_PER_MILE;
  const position = { lat: center.lat, lng: center.lon };
  const open = places.find((place) => place.id === openId);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY!}>
      <div className="h-96 w-full overflow-hidden rounded-2xl border border-line">
        <Map
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
          defaultCenter={position}
          defaultZoom={14}
          gestureHandling="cooperative"
          clickableIcons={false}
          streetViewControl={false}
          mapTypeControl={false}
        >
          <FitToRadius center={position} meters={meters} />
          <Circle center={position} radius={meters} strokeColor="#1c1b19" strokeOpacity={0.5} strokeWeight={1} fillOpacity={0} clickable={false} />
          <AdvancedMarker position={position} title="Search center">
            <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow" />
          </AdvancedMarker>

          {places.map((place, i) => (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.lat, lng: place.lon }}
              title={`${i + 1}. ${place.name}`}
              onClick={() => setOpenId(place.id)}
            >
              <span className={PIN}>{i + 1}</span>
            </AdvancedMarker>
          ))}

          {open && (
            <InfoWindow
              position={{ lat: open.lat, lng: open.lon }}
              pixelOffset={[0, -16]}
              onCloseClick={() => setOpenId(null)}
              headerContent={<strong className="font-medium">{open.name}</strong>}
            >
              <div className="flex flex-col gap-1 text-sm text-ink">
                <span className="text-muted">
                  {[open.kind, open.rating && `★ ${open.rating}`, formatMiles(open.miles)].filter(Boolean).join(" · ")}
                </span>
                {open.mapsUrl && (
                  <a href={open.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                    Open in Google Maps
                  </a>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

// Zoom so the whole search circle fits, whenever the search area changes
function FitToRadius({ center, meters }: { center: google.maps.LatLngLiteral; meters: number }) {
  const map = useMap();
  const { lat, lng } = center;

  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.Circle({ center: { lat, lng }, radius: meters }).getBounds();
    if (bounds) map.fitBounds(bounds, 0);
  }, [map, lat, lng, meters]);

  return null;
}
