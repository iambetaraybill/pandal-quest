import { defaultDayFor } from "@/lib/data/calendar";
import { findPandalsInText, findPlaceInText, matchPandal, matchPlace } from "@/lib/engine/match";
import {
  CROWD_TOLERANCES,
  GROUPS,
  INTERESTS,
  PUJA_DAY_IDS,
  type CrowdTolerance,
  type Group,
  type Interest,
  type PujaDayId,
  type TripIntent,
} from "@/lib/types";

export function defaultIntent(todayIso = "2026-10-11"): TripIntent {
  return {
    startPlaceId: "shyambazar",
    startCoords: null,
    day: defaultDayFor(todayIso),
    startTime: "18:00",
    durationMinutes: 180,
    group: "friends",
    interests: ["traditional", "art"],
    crowdTolerance: "medium",
    mustSee: [],
    avoid: [],
  };
}

const DAY_WORDS: [RegExp, PujaDayId][] = [
  [/\b(shashthi|sasthi|shoshthi|sosthi|6th)\b/i, "shashthi"],
  [/\b(saptami|soptomi|shoptomi|7th)\b/i, "saptami"],
  [/\b(ashtami|astami|oshtomi|ashtomi|8th)\b/i, "ashtami"],
  [/\b(navami|nabami|nobomi|9th)\b/i, "navami"],
  [/\b(dashami|doshomi|dasami|bijoya|vijaya|10th)\b/i, "dashami"],
  [/\b(panchami|ponchomi|5th)\b/i, "panchami"],
  [/\b(before puj[oa]|pre[- ]?puj[oa]|this week|chaturthi|tritiya)\b/i, "pre"],
];

const INTEREST_WORDS: [RegExp, Interest][] = [
  [/\b(bonedi|rajbari|zamindar|family puj|bari puj|old houses?)\b/i, "bonedi"],
  [/\b(heritage|history|historic|old|oldest|colonial)\b/i, "heritage"],
  [/\b(traditional|sabeki|daker saaj|classic|ek ?chala)\b/i, "traditional"],
  [/\b(theme|themed|installation|concept)\b/i, "theme"],
  [/\b(art|artistic|craft|creative|design|photo|photography)\b/i, "art"],
  [/\b(famous|big|biggest|iconic|blockbuster|popular|must[- ]see)\b/i, "famous"],
  [/\b(quiet|calm|peaceful|less crowd|no crowd|offbeat|hidden)\b/i, "quiet"],
];

function parseTime(text: string): string | null {
  const t = text.toLowerCase();
  const m = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/.exec(t);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].startsWith("p")) h += 12;
    return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
  }
  const m24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
  if (/\bafter midnight|late night|all[- ]night\b/.test(t)) return "22:00";
  if (/\bmorning|anjali\b/.test(t)) return "09:00";
  if (/\bafternoon|lunch\b/.test(t)) return "15:00";
  if (/\bevening|sunset|sondhe|shondhe\b/.test(t)) return "18:00";
  if (/\bnight|dinner\b/.test(t)) return "20:00";
  return null;
}

function parseDuration(text: string): number | null {
  const t = text.toLowerCase();
  if (/\ball[- ]night\b/.test(t)) return 360;
  const m = /\b(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(?:\d+\s*)?(hours?|hrs?|h)\b/.exec(t);
  if (m) return Math.round(Math.min(8, Math.max(1, Number(m[1]))) * 60);
  const mins = /\b(\d{2,3})\s*(minutes|mins?)\b/.exec(t);
  if (mins) return Math.min(480, Math.max(45, Number(mins[1])));
  if (/\bcouple of hours|two hours\b/.test(t)) return 120;
  if (/\bthree hours\b/.test(t)) return 180;
  return null;
}

function parseGroup(text: string): Group | null {
  const t = text.toLowerCase();
  if (/\b(grand(ma|pa|mother|father|parents)|elderly|elders|old parents|knee|wheelchair|senior|thakuma|dida|dadu)\b/.test(t)) return "elders";
  if (/\b(kids?|children|child|toddler|son|daughter|baby)\b/.test(t)) return "kids";
  if (/\b(parents|mom|mum|dad|family|ma|baba)\b/.test(t)) return "family";
  if (/\b(friends|gang|buddies|college|squad|boys|girls)\b/.test(t)) return "friends";
  if (/\b(alone|solo|by myself|just me)\b/.test(t)) return "solo";
  return null;
}

function parseCrowd(text: string): CrowdTolerance | null {
  const t = text.toLowerCase();
  if (/\b(hate|avoid|no|skip|less|minimal|without)\b[^.]{0,20}\b(crowds?|queues?|lines?|rush|bheer|bhir)\b|\bclaustrophobic\b/.test(t)) return "low";
  if (/\b(don'?t mind|ok with|love|happy to)\b[^.]{0,20}\b(crowds?|queues?|lines?|rush)\b/.test(t)) return "high";
  return null;
}

/**
 * Deterministic fallback used when no local model is reachable. It is deliberately simple:
 * the point of the project is that Gemma does this better, but the app must never dead-end.
 */
export function parseIntentRules(text: string, base: TripIntent = defaultIntent()): TripIntent {
  const intent: TripIntent = { ...base, mustSee: [...base.mustSee], interests: [...base.interests] };
  for (const [re, day] of DAY_WORDS) {
    if (re.test(text)) {
      intent.day = day;
      break;
    }
  }
  intent.startTime = parseTime(text) ?? intent.startTime;
  intent.durationMinutes = parseDuration(text) ?? intent.durationMinutes;
  intent.group = parseGroup(text) ?? intent.group;
  intent.crowdTolerance = parseCrowd(text) ?? intent.crowdTolerance;
  const interests = INTEREST_WORDS.filter(([re]) => re.test(text)).map(([, i]) => i);
  if (interests.length) intent.interests = [...new Set(interests)];
  if (intent.crowdTolerance === "low" && !intent.interests.includes("quiet") && !intent.interests.includes("famous")) {
    intent.interests.push("quiet");
  }
  const place = findPlaceInText(text);
  if (place) intent.startPlaceId = place.id;
  const placeWords = place ? [place.name, ...place.aliases].map((a) => a.toLowerCase()) : [];
  intent.mustSee = findPandalsInText(text)
    .filter((p) => !p.aliases.some((a) => placeWords.includes(a)))
    .map((p) => p.id);
  return intent;
}

/** Raw shape returned by Gemma. Everything is optional and validated before use. */
export interface RawIntent {
  startPlace?: string | null;
  day?: string | null;
  startTime?: string | null;
  durationMinutes?: number | null;
  group?: string | null;
  interests?: string[] | null;
  crowdTolerance?: string | null;
  mustSee?: string[] | null;
  avoid?: string[] | null;
  notes?: string | null;
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** Validates model output against the dataset so a hallucinated pandal can never reach the planner. */
export function intentFromRaw(raw: RawIntent, base: TripIntent): TripIntent {
  const intent: TripIntent = { ...base };
  if (raw.startPlace) {
    const place = matchPlace(raw.startPlace);
    if (place) intent.startPlaceId = place.id;
  }
  if (isOneOf(PUJA_DAY_IDS, raw.day)) intent.day = raw.day;
  if (raw.startTime && /^\d{1,2}:\d{2}$/.test(raw.startTime)) {
    const [h, m] = raw.startTime.split(":").map(Number);
    if (h < 24 && m < 60) intent.startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (typeof raw.durationMinutes === "number" && raw.durationMinutes > 0) {
    intent.durationMinutes = Math.round(Math.min(480, Math.max(45, raw.durationMinutes)));
  }
  if (isOneOf(GROUPS, raw.group)) intent.group = raw.group;
  if (isOneOf(CROWD_TOLERANCES, raw.crowdTolerance)) intent.crowdTolerance = raw.crowdTolerance;
  const interests = (raw.interests ?? []).filter((i): i is Interest => isOneOf(INTERESTS, i));
  if (interests.length) intent.interests = [...new Set(interests)];
  const resolve = (names: string[] | null | undefined) =>
    [...new Set((names ?? []).map((n) => matchPandal(n)?.id).filter((id): id is string => !!id))];
  intent.mustSee = resolve(raw.mustSee);
  intent.avoid = resolve(raw.avoid).filter((id) => !intent.mustSee.includes(id));
  if (raw.notes) intent.notes = raw.notes.slice(0, 280);
  return intent;
}
