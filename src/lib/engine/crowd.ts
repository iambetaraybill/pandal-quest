import { PUJA_DAY_BY_ID } from "@/lib/data/calendar";
import type { CrowdLevel, Pandal, PujaDayId } from "@/lib/types";

/**
 * Crowd Clock: a transparent heuristic, not live data.
 * queue = peak queue for the pandal's tier × time-of-night curve × day factor.
 * The curve encodes what every Kolkatan knows: afternoons are easy, 8 pm–1 am is chaos,
 * and the hours before dawn are surprisingly calm.
 */
const HOUR_CURVE = [
  0.85, 0.72, 0.55, 0.38, 0.25, 0.15, 0.1, 0.1, 0.14, 0.18, 0.2, 0.22, 0.22, 0.22, 0.25, 0.32, 0.42, 0.55,
  0.68, 0.82, 0.93, 1.0, 1.0, 0.95,
];

/** Typical worst-case queue in minutes for each popularity tier. */
const PEAK_QUEUE_BY_TIER: Record<Pandal["tier"], number> = { 1: 5, 2: 12, 3: 30, 4: 60, 5: 110 };

export function hourCurve(minOfDay: number): number {
  const m = ((minOfDay % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const t = (m % 60) / 60;
  return HOUR_CURVE[h] * (1 - t) + HOUR_CURVE[(h + 1) % 24] * t;
}

/** Open lanes have no queue; family pujas in old houses draw thinner, slower-moving crowds. */
const KIND_FACTOR: Record<Pandal["kind"], number> = { pandal: 1, bonedi: 0.5, landmark: 0 };

export function queueMinutes(pandal: Pandal, day: PujaDayId, minOfDay: number): number {
  const dayFactor = PUJA_DAY_BY_ID.get(day)?.crowdFactor ?? 1;
  let curve = hourCurve(minOfDay);
  const m = ((minOfDay % 1440) + 1440) % 1440;
  // Ashtami morning anjali packs the traditional and family pujas.
  if (day === "ashtami" && m >= 8 * 60 && m <= 11.5 * 60 && pandal.tags.some((t) => t === "traditional" || t === "bonedi")) {
    curve = Math.min(1, curve + 0.3);
  }
  return Math.round(PEAK_QUEUE_BY_TIER[pandal.tier] * KIND_FACTOR[pandal.kind] * curve * dayFactor);
}

export function crowdLevel(queueMin: number): CrowdLevel {
  if (queueMin < 10) return "calm";
  if (queueMin < 30) return "moderate";
  if (queueMin < 60) return "busy";
  return "packed";
}

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  calm: "Calm",
  moderate: "Moderate",
  busy: "Busy",
  packed: "Packed",
};

/** Queue estimate for each hour from noon to 4 am, for the Crowd Clock chart. */
export function crowdClock(pandal: Pandal, day: PujaDayId): { min: number; queue: number }[] {
  const out: { min: number; queue: number }[] = [];
  for (let h = 12; h <= 28; h++) out.push({ min: h * 60, queue: queueMinutes(pandal, day, h * 60) });
  return out;
}

export function bestTimeToVisit(
  pandal: Pandal,
  day: PujaDayId,
  fromMin = 12 * 60,
  toMin = 26 * 60,
): { min: number; queue: number } {
  let best = { min: fromMin, queue: Number.POSITIVE_INFINITY };
  for (let m = fromMin; m <= toMin; m += 30) {
    const q = queueMinutes(pandal, day, m);
    if (q < best.queue) best = { min: m, queue: q };
  }
  return best;
}

export function isImmersionRisk(day: PujaDayId, minOfDay: number): boolean {
  return day === "dashami" && minOfDay >= 15 * 60;
}
