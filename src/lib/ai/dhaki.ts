import "server-only";
import { PUJA_DAY_BY_ID } from "@/lib/data/calendar";
import { PANDALS } from "@/lib/data/pandals";
import { PLACES } from "@/lib/data/places";
import { DHAKI_SYSTEM } from "@/lib/ai/prompts";
import { chatTools, type ChatMessage, type GenStats, type ToolSpec } from "@/lib/ai/ollama";
import { bestTimeToVisit, CROWD_LABEL, crowdLevel, queueMinutes } from "@/lib/engine/crowd";
import { walkingMeters, walkMinutes } from "@/lib/engine/geo";
import { matchPandal, matchPlace } from "@/lib/engine/match";
import { formatClock, parseClock } from "@/lib/engine/time";
import { INTERESTS, PUJA_DAY_IDS, type PujaDayId } from "@/lib/types";

export const DHAKI_TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "find_pandals",
      description: "Search the curated list of Kolkata pandals by area, interest or name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text name or neighbourhood" },
          area: { type: "string", enum: ["North", "Central", "South", "Salt Lake", "Howrah", "Behala"] },
          interest: { type: "string", enum: [...INTERESTS] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crowd_forecast",
      description: "Estimated queue minutes at a pandal for a puja day and time, plus the calmest time that day.",
      parameters: {
        type: "object",
        properties: {
          pandal: { type: "string" },
          day: { type: "string", enum: [...PUJA_DAY_IDS] },
          time: { type: "string", description: "24h HH:MM" },
        },
        required: ["pandal", "day"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "nearest_station",
      description: "Nearest metro or rail station to a pandal, with walking distance.",
      parameters: { type: "object", properties: { pandal: { type: "string" } }, required: ["pandal"] },
    },
  },
  {
    type: "function",
    function: {
      name: "walking_distance",
      description: "Walking distance and time between two pandals or places.",
      parameters: {
        type: "object",
        properties: { from: { type: "string" }, to: { type: "string" } },
        required: ["from", "to"],
      },
    },
  },
];

type Args = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

function locate(name: string) {
  const p = matchPandal(name);
  if (p) return { name: p.name, lat: p.lat, lng: p.lng };
  const pl = matchPlace(name);
  return pl ? { name: pl.name, lat: pl.lat, lng: pl.lng } : null;
}

export function runTool(name: string, args: Args, defaults: { day: PujaDayId; time: string }): unknown {
  switch (name) {
    case "find_pandals": {
      const q = str(args.query).toLowerCase();
      const area = str(args.area);
      const interest = str(args.interest);
      const hits = PANDALS.filter(
        (p) =>
          (!area || p.area === area) &&
          (!interest || p.tags.includes(interest as never)) &&
          (!q || `${p.name} ${p.neighbourhood} ${p.aliases.join(" ")}`.toLowerCase().includes(q)),
      )
        .slice(0, 6)
        .map((p) => ({ name: p.name, neighbourhood: p.neighbourhood, tags: p.tags, knownFor: p.knownFor }));
      return hits.length ? hits : { result: "No matching pandals in the curated list." };
    }
    case "crowd_forecast": {
      const p = matchPandal(str(args.pandal));
      if (!p) return { error: `Unknown pandal "${str(args.pandal)}"` };
      const day = (PUJA_DAY_IDS as readonly string[]).includes(str(args.day)) ? (str(args.day) as PujaDayId) : defaults.day;
      const min = parseClock(str(args.time) || defaults.time);
      const q = queueMinutes(p, day, min);
      const best = bestTimeToVisit(p, day);
      return {
        pandal: p.name,
        day: PUJA_DAY_BY_ID.get(day)?.label,
        time: formatClock(min),
        queueMinutes: q,
        crowd: CROWD_LABEL[crowdLevel(q)],
        calmestTime: formatClock(best.min),
        calmestQueueMinutes: best.queue,
        note: "Heuristic estimate from day, hour and popularity, not live data.",
      };
    }
    case "nearest_station": {
      const p = matchPandal(str(args.pandal));
      if (!p) return { error: `Unknown pandal "${str(args.pandal)}"` };
      const best = PLACES.filter((s) => s.kind !== "landmark")
        .map((s) => ({ station: s.name, meters: Math.round(walkingMeters(p, s)) }))
        .sort((a, b) => a.meters - b.meters)[0];
      return { pandal: p.name, ...best, walkMinutes: Math.round(walkMinutes(best.meters, 4.4)) };
    }
    case "walking_distance": {
      const a = locate(str(args.from));
      const b = locate(str(args.to));
      if (!a || !b) return { error: "Could not find one of those places." };
      const m = Math.round(walkingMeters(a, b));
      return { from: a.name, to: b.name, meters: m, walkMinutes: Math.round(walkMinutes(m, 4.4)) };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

export type DhakiEvent =
  | { type: "tool_call"; name: string; args: Args }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "answer"; text: string; stats: GenStats };

export async function* askDhaki(
  history: { role: "user" | "assistant"; content: string }[],
  defaults: { day: PujaDayId; time: string },
): AsyncGenerator<DhakiEvent> {
  const day = PUJA_DAY_BY_ID.get(defaults.day)!;
  const messages: ChatMessage[] = [
    { role: "system", content: `${DHAKI_SYSTEM}\nIf the user doesn't say, assume ${day.label} at ${defaults.time}.` },
    ...history.slice(-8),
  ];
  for (let round = 0; round < 4; round++) {
    const { message, stats } = await chatTools(messages, DHAKI_TOOLS);
    const calls = message.tool_calls ?? [];
    if (!calls.length) {
      yield { type: "answer", text: message.content.trim(), stats };
      return;
    }
    messages.push({ role: "assistant", content: message.content ?? "", tool_calls: calls });
    for (const call of calls) {
      const args = call.function.arguments ?? {};
      yield { type: "tool_call", name: call.function.name, args };
      const result = runTool(call.function.name, args, defaults);
      yield { type: "tool_result", name: call.function.name, result };
      messages.push({ role: "tool", tool_name: call.function.name, content: JSON.stringify(result) });
    }
  }
  yield {
    type: "answer",
    text: "I went round in circles on that one. Try asking about a single pandal.",
    stats: { model: "", tokens: 0, tokensPerSec: 0, ms: 0 },
  };
}
