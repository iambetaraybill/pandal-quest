import type { PujaDay, PujaDayId } from "@/lib/types";

/**
 * Durga Puja 2026 in Kolkata (Bisuddha Siddhanta panjika). Mahalaya fell on Saturday, 10 October.
 * Panjikas disagree on whether Saturday 17 October is Shashthi or Saptami, so it gets its own entry.
 * crowdFactor scales the crowd model: weekends and Ashtami are the heaviest nights.
 */
export const PUJA_DAYS: PujaDay[] = [
  { id: "pre", label: "Before Pujo", bn: "পুজোর আগে", date: "2026-10-14", weekday: "Wed", crowdFactor: 0.35, note: "Many big pandals open early. Quietest time to see them." },
  { id: "panchami", label: "Panchami", bn: "পঞ্চমী", date: "2026-10-15", weekday: "Thu", crowdFactor: 0.55 },
  { id: "shashthi", label: "Shashthi", bn: "ষষ্ঠী", date: "2026-10-16", weekday: "Fri", crowdFactor: 0.75, note: "Bodhon: the goddess is ceremonially awakened." },
  { id: "shashthi2", label: "Shashthi / Saptami", bn: "ষষ্ঠী / সপ্তমী", date: "2026-10-17", weekday: "Sat", crowdFactor: 0.92, note: "A Saturday, so crowds build early." },
  { id: "saptami", label: "Saptami", bn: "সপ্তমী", date: "2026-10-18", weekday: "Sun", crowdFactor: 1.0, note: "Kola bou bath at dawn; a Sunday, so expect full streets." },
  { id: "ashtami", label: "Ashtami", bn: "অষ্টমী", date: "2026-10-19", weekday: "Mon", crowdFactor: 1.0, note: "Morning anjali and Sandhi Puja around 10:29–11:17 AM." },
  { id: "navami", label: "Navami", bn: "নবমী", date: "2026-10-20", weekday: "Tue", crowdFactor: 0.9, note: "The last big night of pandal hopping." },
  { id: "dashami", label: "Dashami", bn: "দশমী", date: "2026-10-21", weekday: "Wed", crowdFactor: 0.45, note: "Sindoor khela and immersions; many idols leave by evening." },
];

export const PUJA_DAY_BY_ID = new Map(PUJA_DAYS.map((d) => [d.id, d])) as Map<PujaDayId, PujaDay>;

export const MAHALAYA = "2026-10-10";

export function dayForDate(isoDate: string): PujaDayId | null {
  return PUJA_DAYS.find((d) => d.date === isoDate)?.id ?? null;
}

/** Picks the puja day a planner should default to for a given local date. */
export function defaultDayFor(isoDate: string): PujaDayId {
  const exact = dayForDate(isoDate);
  if (exact) return exact;
  if (isoDate < "2026-10-15") return "pre";
  return "saptami";
}

export function daysUntil(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
