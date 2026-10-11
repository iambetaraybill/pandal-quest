export const INTERESTS = [
  "heritage",
  "bonedi",
  "traditional",
  "theme",
  "art",
  "famous",
  "quiet",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const GROUPS = ["solo", "friends", "family", "elders", "kids"] as const;
export type Group = (typeof GROUPS)[number];

export const CROWD_TOLERANCES = ["low", "medium", "high"] as const;
export type CrowdTolerance = (typeof CROWD_TOLERANCES)[number];

export type Area = "North" | "Central" | "South" | "Salt Lake" | "Howrah" | "Behala";
export type StopKind = "pandal" | "bonedi" | "landmark";

export interface Pandal {
  id: string;
  name: string;
  bn: string;
  kind: StopKind;
  area: Area;
  neighbourhood: string;
  lat: number;
  lng: number;
  /** "osm" = pinned from an OpenStreetMap feature, "approx" = estimated, so the arrival radius is wider. */
  coord: "osm" | "approx";
  radiusM: number;
  /** 1 (para puja) .. 5 (city-wide crowd magnet). Drives the crowd model. */
  tier: 1 | 2 | 3 | 4 | 5;
  tags: Interest[];
  since?: number;
  knownFor: string;
  aliases: string[];
}

export const PUJA_DAY_IDS = [
  "pre",
  "panchami",
  "shashthi",
  "shashthi2",
  "saptami",
  "ashtami",
  "navami",
  "dashami",
] as const;
export type PujaDayId = (typeof PUJA_DAY_IDS)[number];

export interface PujaDay {
  id: PujaDayId;
  label: string;
  bn: string;
  date: string;
  weekday: string;
  crowdFactor: number;
  note?: string;
}

export interface StartPlace {
  id: string;
  name: string;
  kind: "metro" | "rail" | "landmark";
  lat: number;
  lng: number;
  aliases: string[];
}

export interface TripIntent {
  startPlaceId: string;
  /** Overrides startPlaceId when the walker shares their live location. */
  startCoords?: { lat: number; lng: number } | null;
  day: PujaDayId;
  /** "HH:MM", 24h */
  startTime: string;
  durationMinutes: number;
  group: Group;
  interests: Interest[];
  crowdTolerance: CrowdTolerance;
  mustSee: string[];
  avoid: string[];
  notes?: string;
}

export type CrowdLevel = "calm" | "moderate" | "busy" | "packed";

export interface PlannedStop {
  pandal: Pandal;
  order: number;
  /** Minutes after midnight of the puja day; may exceed 1440 after midnight. */
  arriveMin: number;
  queueMin: number;
  dwellMin: number;
  departMin: number;
  legMeters: number;
  legWalkMin: number;
  crowd: CrowdLevel;
  /** Queue the walker would face at 9 pm, the usual peak, for comparison. */
  peakQueueMin: number;
  reasons: string[];
}

export interface Plan {
  id: string;
  intent: TripIntent;
  start: { id: string; name: string; lat: number; lng: number };
  stops: PlannedStop[];
  totals: {
    walkMeters: number;
    walkMin: number;
    queueMin: number;
    peakQueueMin: number;
    dwellMin: number;
    totalMin: number;
    endMin: number;
  };
  endMetro: { name: string; meters: number } | null;
  skipped: { id: string; name: string; reason: string }[];
  warnings: string[];
}

export interface StoryPack {
  id: string;
  story: string;
  lookFor: string[];
  trivia: { q: string; options: string[]; answer: number };
  model: string;
  lang: "en" | "bn";
}

export type IntentSource = "gemma" | "rules";

export interface AiStats {
  model: string;
  tokens: number;
  tokensPerSec: number;
  ms: number;
}
