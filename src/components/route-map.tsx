"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { cn } from "@/lib/utils";

export interface MapStop {
  id: string;
  lat: number;
  lng: number;
  label: string;
  name: string;
  state: "todo" | "next" | "done" | "skipped";
  approxRadius?: number;
}

interface Props {
  start: { lat: number; lng: number; name: string };
  stops: MapStop[];
  you?: { lat: number; lng: number } | null;
  className?: string;
  /** Re-fit the view whenever this changes. */
  fitKey?: string;
  focus?: { lat: number; lng: number } | null;
}

const SINDOOR = "#be241f";
const YOU = "#3b82f6";

const iconCache = new Map<string, L.DivIcon>();
function icon(label: string, state: string): L.DivIcon {
  const key = `${label}:${state}`;
  let i = iconCache.get(key);
  if (!i) {
    i = L.divIcon({
      className: "",
      html: `<div class="pq-marker ${state}">${label}</div>`,
      iconSize: state === "you" ? [18, 18] : [30, 30],
      iconAnchor: state === "you" ? [9, 9] : [15, 15],
    });
    iconCache.set(key, i);
  }
  return i;
}

function FitBounds({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    // Points are derived from fitKey; refitting on every render would fight the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

function Follow({ focus }: { focus: { lat: number; lng: number } | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.panTo([focus.lat, focus.lng], { animate: true });
  }, [focus, map]);
  return null;
}

export function RouteMap({ start, stops, you, className, fitKey, focus }: Props) {
  const points = useMemo<[number, number][]>(
    () => [[start.lat, start.lng], ...stops.map((s) => [s.lat, s.lng] as [number, number])],
    [start, stops],
  );
  const next = stops.find((s) => s.state === "next");
  const key = fitKey ?? points.map((p) => p.join(",")).join("|");

  return (
    <MapContainer
      center={points[0]}
      zoom={14}
      scrollWheelZoom={false}
      className={cn("size-full", className)}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <FitBounds points={points} fitKey={key} />
      <Follow focus={focus} />
      <Polyline positions={points} pathOptions={{ color: SINDOOR, weight: 3, opacity: 0.75, dashArray: "2 8", lineCap: "round" }} />
      {stops.map((s) =>
        s.approxRadius ? (
          <Circle
            key={`r-${s.id}`}
            center={[s.lat, s.lng]}
            radius={s.approxRadius}
            pathOptions={{ color: SINDOOR, weight: 1, opacity: 0.4, fillOpacity: 0.06, dashArray: "3 4" }}
          />
        ) : null,
      )}
      <Marker position={[start.lat, start.lng]} icon={icon("S", "start")}>
        <Tooltip direction="top" offset={[0, -14]}>
          Start · {start.name}
        </Tooltip>
      </Marker>
      {stops.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={icon(s.state === "done" ? "✓" : s.label, s.state)}>
          <Tooltip direction="top" offset={[0, -14]}>
            {s.label}. {s.name}
            {s.approxRadius ? " (approximate pin)" : ""}
          </Tooltip>
        </Marker>
      ))}
      {you && (
        <>
          {next && (
            <Polyline
              positions={[
                [you.lat, you.lng],
                [next.lat, next.lng],
              ]}
              pathOptions={{ color: YOU, weight: 2, opacity: 0.7, dashArray: "1 6" }}
            />
          )}
          <Marker position={[you.lat, you.lng]} icon={icon("", "you")} zIndexOffset={1000} />
        </>
      )}
    </MapContainer>
  );
}

export default RouteMap;
