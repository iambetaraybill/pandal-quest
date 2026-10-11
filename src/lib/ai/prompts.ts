import { PUJA_DAYS, PUJA_DAY_BY_ID } from "@/lib/data/calendar";
import { PANDALS } from "@/lib/data/pandals";
import { PLACES } from "@/lib/data/places";
import { formatClock, formatDuration, parseClock } from "@/lib/engine/time";
import { GROUPS, INTERESTS, PUJA_DAY_IDS, type Pandal, type Plan } from "@/lib/types";
import type { ChatMessage } from "@/lib/ai/ollama";

const dayList = PUJA_DAYS.map((d) => `${d.id} = ${d.label}, ${d.weekday} ${d.date.slice(5)}`).join("; ");

export const INTENT_SCHEMA = {
  type: "object",
  properties: {
    startPlace: { type: ["string", "null"], description: "Where they start, copied from the request" },
    day: { type: ["string", "null"], enum: [...PUJA_DAY_IDS, null] },
    startTime: { type: ["string", "null"], description: "24h HH:MM" },
    durationMinutes: { type: ["integer", "null"] },
    group: { type: "string", enum: [...GROUPS] },
    interests: { type: "array", items: { type: "string", enum: [...INTERESTS] } },
    crowdTolerance: { type: "string", enum: ["low", "medium", "high"] },
    mustSee: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    notes: { type: "string", description: "One short sentence about anything else that matters" },
  },
  required: ["startPlace", "day", "startTime", "durationMinutes", "group", "interests", "crowdTolerance", "mustSee", "avoid", "notes"],
} as const;

export function intentMessages(text: string, todayIso: string): ChatMessage[] {
  const places = PLACES.map((p) => p.name.replace(/ Metro.*| Station/, "")).join(", ");
  const pandals = PANDALS.map((p) => p.name).join(", ");
  return [
    {
      role: "system",
      content: `You turn a Durga Puja pandal-hopping request from Kolkata into JSON for a route planner.
Today is ${todayIso}. Puja days: ${dayList}. Use "pre" for any day before Panchami.
Start places we know: ${places}.
Pandals we know: ${pandals}.
Rules:
- group: "elders" if anyone is elderly or has limited mobility (knees, wheelchair, grandparents); "kids" if children come; "family" for parents without mobility issues; "friends" for a group of friends; "solo" if alone.
- interests: heritage = history and old buildings; bonedi = old family pujas in rajbaris; traditional = classic idols; theme = themed pandals; art = craft and installations; famous = the big crowd-pullers; quiet = calm, offbeat places. Pick only what the request supports.
- crowdTolerance: "low" if they dislike crowds or queues or bring elders or kids, "high" if they say crowds are fine, otherwise "medium".
- mustSee / avoid: pandal names exactly as listed above, only if the request names them.
- Times: evening = 18:00, night = 20:00, afternoon = 15:00, morning = 09:00. Use null when not stated.`,
    },
    { role: "user", content: text },
  ];
}

function stopLine(s: Plan["stops"][number]): string {
  const p = s.pandal;
  return `${s.order}. ${p.name} (${p.neighbourhood}) — arrive ${formatClock(s.arriveMin)}, queue ~${s.queueMin} min (at 9 pm it would be ~${s.peakQueueMin}), ${s.legMeters} m walk from the previous point. Known for: ${p.knownFor}`;
}

export function narrationMessages(plan: Plan, lang: "en" | "bn"): ChatMessage[] {
  const day = PUJA_DAY_BY_ID.get(plan.intent.day)!;
  const facts = [
    `Day: ${day.label} (${day.weekday} ${day.date}). ${day.note ?? ""}`,
    `Start: ${plan.start.name} at ${formatClock(parseClock(plan.intent.startTime))}.`,
    `Group: ${plan.intent.group}. Crowd tolerance: ${plan.intent.crowdTolerance}.`,
    `Stops:\n${plan.stops.map(stopLine).join("\n")}`,
    `Totals: ${(plan.totals.walkMeters / 1000).toFixed(1)} km on foot, ${formatDuration(plan.totals.totalMin)} overall, about ${plan.totals.queueMin} min in queues versus ${plan.totals.peakQueueMin} min if visited at 9 pm.`,
    plan.endMetro ? `Nearest station at the end: ${plan.endMetro.name}, ${plan.endMetro.meters} m.` : "",
    plan.skipped.length ? `Could not fit: ${plan.skipped.map((s) => s.name).join(", ")}.` : "",
    plan.intent.notes ? `Walker's note: ${plan.intent.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const language =
    lang === "bn"
      ? "Write in Bengali (Bangla script), in warm conversational Kolkata Bangla."
      : "Write in English with the odd Bengali word a Kolkatan would use (pujo, thakur, para).";
  return [
    {
      role: "system",
      content: `You are Pandal Quest, a friendly Kolkata local who plans walking routes for Durga Puja.
Write a short plan intro of 90 to 130 words in second person. ${language}
Explain the order using the queue numbers and times you are given (for example, why a big pandal comes first).
Mention the walking total and where they finish. End with one line nudging them to put the phone away and look up.
Use only the facts provided. Do not invent pandal history, prices, food stalls or directions. No lists, no headings, no emoji.`,
    },
    { role: "user", content: facts },
  ];
}

export const STORY_SCHEMA = {
  type: "object",
  properties: {
    story: { type: "string", description: "2-3 sentences, under 70 words" },
    lookFor: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    trivia: {
      type: "object",
      properties: {
        q: { type: "string" },
        options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 },
        answer: { type: "integer", description: "0-based index of the correct option" },
      },
      required: ["q", "options", "answer"],
    },
  },
  required: ["story", "lookFor", "trivia"],
} as const;

export function storyMessages(p: Pandal, lang: "en" | "bn"): ChatMessage[] {
  const facts = [
    `Name: ${p.name} (${p.bn})`,
    `Neighbourhood: ${p.neighbourhood}, ${p.area} Kolkata`,
    `Type: ${p.kind === "bonedi" ? "family puja in an old house (bonedi bari)" : p.kind === "landmark" ? "a place to walk, not a pandal" : "community puja (sarbojanin)"}`,
    p.since ? `Running since: ${p.since}` : "",
    `Known for: ${p.knownFor}`,
  ]
    .filter(Boolean)
    .join("\n");
  return [
    {
      role: "system",
      content: `You write the card a walker unlocks when they physically arrive at a Durga Puja stop in Kolkata.
${lang === "bn" ? "Write everything in Bengali (Bangla script)." : "Write in English."}
- story: 2-3 vivid sentences welcoming them, using only the stop facts given plus general Durga Puja culture.
- lookFor: exactly 3 short things to find with their own eyes right there (for example Ganesha's mouse, Lakshmi's owl, the chalchitra arch behind the idols, the dhak drummers, the sculptor's work). Each under 12 words, starting with a verb.
- trivia: one multiple-choice question about Durga Puja culture or the facts given, with 3-4 options and the 0-based index of the correct one.
Never invent dates, names, awards or this year's theme. If unsure, stay general.`,
    },
    { role: "user", content: facts },
  ];
}

export const DHAKI_SYSTEM = `You are Dhaki, a pandal-hopping guide for Durga Puja 2026 in Kolkata, running fully offline on the user's own device.
Always use the tools for crowds, pandal facts, distances and stations; never guess numbers.
Puja days: ${dayList}.
Answer in under 70 words, warmly, like a Kolkata local. If a tool returns nothing useful, say so plainly.`;
