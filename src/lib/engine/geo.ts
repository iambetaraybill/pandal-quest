const R = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b in degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
export function compassWord(deg: number): string {
  return COMPASS[Math.round(deg / 45) % 8];
}

/** Old-city lanes are anything but straight; straight-line distance under-counts real walking. */
export const STREET_DETOUR = 1.3;

export function walkingMeters(a: LatLng, b: LatLng): number {
  return haversine(a, b) * STREET_DETOUR;
}

export function walkMinutes(meters: number, kmh: number): number {
  return meters / ((kmh * 1000) / 60);
}

export function formatDistance(m: number): string {
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Moves `meters` from a towards b (used by the demo walk simulator). */
export function stepTowards(a: LatLng, b: LatLng, meters: number): LatLng {
  const d = haversine(a, b);
  if (d <= meters || d === 0) return { ...b };
  const f = meters / d;
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
}
