import { PANDALS, PANDAL_BY_ID } from "@/lib/data/pandals";
import { PLACES, PLACE_BY_ID } from "@/lib/data/places";
import { crowdLevel, isImmersionRisk, queueMinutes } from "@/lib/engine/crowd";
import { haversine, walkingMeters, walkMinutes, type LatLng } from "@/lib/engine/geo";
import { formatClock, parseClock } from "@/lib/engine/time";
import type { Group, Pandal, Plan, PlannedStop, TripIntent } from "@/lib/types";

const PACE_KMH: Record<Group, number> = { solo: 4.6, friends: 4.4, family: 3.8, elders: 3.0, kids: 3.2 };
const MAX_LEG_M: Record<Group, number> = { solo: 3200, friends: 3200, family: 2600, elders: 1800, kids: 2000 };
const REST_MIN: Record<Group, number> = { solo: 0, friends: 0, family: 3, elders: 8, kids: 6 };
const CROWD_DIVISOR = { low: 18, medium: 35, high: 90 } as const;
const PEAK_MIN = 21 * 60;
const MAX_STOPS = 8;
const GRACE_MIN = 10;

export function dwellMinutes(p: Pandal): number {
  if (p.kind === "landmark") return 25;
  if (p.kind === "bonedi") return 20;
  return p.tier >= 4 ? 20 : 15;
}

interface Ctx {
  intent: TripIntent;
  start: LatLng;
  startMin: number;
  pace: number;
  maxLeg: number;
  rest: number;
  mustSee: Set<string>;
}

interface Sim {
  stops: PlannedStop[];
  score: number;
  totalMin: number;
  feasible: boolean;
}

function stopScore(p: Pandal, queue: number, arriveMin: number, ctx: Ctx): number {
  const { interests, crowdTolerance, group, day } = ctx.intent;
  let s = 2;
  s += Math.min(2, p.tags.filter((t) => interests.includes(t)).length) * 1.5;
  if (interests.includes("famous")) s += (p.tier - 2) * 1.6;
  if (interests.includes("quiet")) s += (3 - p.tier) * 0.7;
  if (ctx.mustSee.has(p.id)) s += 15;
  s -= queue / CROWD_DIVISOR[crowdTolerance];
  if (group === "elders" || group === "kids") s -= queue / 45;
  if (isImmersionRisk(day, arriveMin)) s -= 3;
  return s;
}

function simulate(order: Pandal[], ctx: Ctx): Sim {
  let t = ctx.startMin;
  let pos: LatLng = ctx.start;
  let score = 0;
  let feasible = true;
  const stops: PlannedStop[] = [];
  order.forEach((p, i) => {
    const legMeters = walkingMeters(pos, p);
    const legLimit = ctx.mustSee.has(p.id) ? ctx.maxLeg * 1.6 : ctx.maxLeg;
    if (legMeters > legLimit) feasible = false;
    const legWalkMin = walkMinutes(legMeters, ctx.pace) + (i > 0 ? ctx.rest : 0);
    t += legWalkMin;
    const queue = queueMinutes(p, ctx.intent.day, t);
    const dwell = dwellMinutes(p);
    score += stopScore(p, queue, t, ctx);
    stops.push({
      pandal: p,
      order: i + 1,
      arriveMin: Math.round(t),
      queueMin: queue,
      dwellMin: dwell,
      departMin: Math.round(t + queue + dwell),
      legMeters: Math.round(legMeters),
      legWalkMin: Math.round(legWalkMin),
      crowd: crowdLevel(queue),
      peakQueueMin: queueMinutes(p, ctx.intent.day, PEAK_MIN),
      reasons: [],
    });
    t += queue + dwell;
    pos = p;
  });
  const totalMin = t - ctx.startMin;
  if (totalMin > ctx.intent.durationMinutes + GRACE_MIN) feasible = false;
  return { stops, score, totalMin, feasible };
}

function insertAt<T>(arr: T[], i: number, item: T): T[] {
  return [...arr.slice(0, i), item, ...arr.slice(i)];
}

function bestInsertion(route: Pandal[], cand: Pandal, ctx: Ctx, base: Sim) {
  let best: { route: Pandal[]; sim: Sim; ratio: number } | null = null;
  for (let i = 0; i <= route.length; i++) {
    const trial = insertAt(route, i, cand);
    const sim = simulate(trial, ctx);
    if (!sim.feasible) continue;
    const gain = sim.score - base.score;
    if (gain <= 0) continue;
    const ratio = gain / Math.max(5, sim.totalMin - base.totalMin);
    if (!best || ratio > best.ratio) best = { route: trial, sim, ratio };
  }
  return best;
}

function twoOpt(route: Pandal[], ctx: Ctx): Pandal[] {
  let best = route;
  let bestSim = simulate(best, ctx);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const trial = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const sim = simulate(trial, ctx);
        if (!sim.feasible) continue;
        const better =
          sim.score > bestSim.score + 0.01 || (sim.score >= bestSim.score - 0.01 && sim.totalMin < bestSim.totalMin - 1);
        if (better) {
          best = trial;
          bestSim = sim;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Cheapest feasible position for `cand` by total route value (not value-per-minute). */
function insertForValue(route: Pandal[], cand: Pandal, ctx: Ctx): { route: Pandal[]; sim: Sim } | null {
  let best: { route: Pandal[]; sim: Sim } | null = null;
  for (let i = 0; i <= route.length; i++) {
    const trial = insertAt(route, i, cand);
    const sim = simulate(trial, ctx);
    if (!sim.feasible) continue;
    if (!best || sim.score > best.sim.score || (sim.score === best.sim.score && sim.totalMin < best.sim.totalMin)) {
      best = { route: trial, sim };
    }
  }
  return best;
}

/**
 * Time-dependent orienteering with a small beam search. Greedy value-per-minute always grabs the
 * cheapest nearby stop; the beam keeps alternatives alive so a famous pandal visited early can beat
 * three minor ones. The search space is tiny (a couple of dozen candidates), so this stays in milliseconds.
 */
function beamSearch(seed: Pandal[], candidates: Pandal[], ctx: Ctx, width = 24): Pandal[] {
  const key = (r: Pandal[]) => r.map((p) => p.id).sort().join("|");
  let beam = [{ route: seed, sim: simulate(seed, ctx) }];
  let best = beam[0];
  for (let depth = seed.length; depth < MAX_STOPS; depth++) {
    const next = new Map<string, { route: Pandal[]; sim: Sim }>();
    for (const state of beam) {
      for (const cand of candidates) {
        if (state.route.includes(cand)) continue;
        const ins = insertForValue(state.route, cand, ctx);
        if (!ins || ins.sim.score <= state.sim.score) continue;
        const k = key(ins.route);
        const prev = next.get(k);
        if (!prev || ins.sim.score > prev.sim.score) next.set(k, ins);
      }
    }
    if (!next.size) break;
    beam = [...next.values()]
      .sort((a, b) => b.sim.score - a.sim.score || a.sim.totalMin - b.sim.totalMin)
      .slice(0, width);
    if (beam[0].sim.score > best.sim.score) best = beam[0];
  }
  return best.route;
}

function nearestStation(pos: LatLng) {
  let best: { name: string; meters: number } | null = null;
  for (const p of PLACES) {
    if (p.kind === "landmark") continue;
    const m = Math.round(walkingMeters(pos, p));
    if (!best || m < best.meters) best = { name: p.name, meters: m };
  }
  return best;
}

function explain(stop: PlannedStop, ctx: Ctx): string[] {
  const p = stop.pandal;
  const reasons: string[] = [];
  if (ctx.mustSee.has(p.id)) reasons.push("You asked for this one");
  const matched = p.tags.filter((t) => ctx.intent.interests.includes(t));
  if (matched.length) reasons.push(`Matches: ${matched.join(", ")}`);
  if (stop.peakQueueMin - stop.queueMin >= 10) {
    reasons.push(`~${stop.queueMin} min queue at ${formatClock(stop.arriveMin)} vs ~${stop.peakQueueMin} at 9 pm`);
  } else if (stop.queueMin <= 5) {
    reasons.push("Little or no queue");
  }
  if (p.kind === "landmark") reasons.push("A walk, not a queue");
  if (p.since) reasons.push(`Since ${p.since}`);
  return reasons;
}

export function resolveStart(intent: TripIntent): Plan["start"] {
  if (intent.startCoords) return { id: "here", name: "Your location", ...intent.startCoords };
  const place = PLACE_BY_ID.get(intent.startPlaceId) ?? PLACE_BY_ID.get("shyambazar")!;
  return { id: place.id, name: place.name, lat: place.lat, lng: place.lng };
}

function solve(ctx: Ctx) {
  const { intent, start } = ctx;
  const metersPerMin = (ctx.pace * 1000) / 60;
  const reach = Math.min(7500, metersPerMin * intent.durationMinutes * 0.45);
  const avoid = new Set(intent.avoid);
  const candidates = PANDALS.filter(
    (p) => !avoid.has(p.id) && (ctx.mustSee.has(p.id) || haversine(start, p) <= reach),
  );

  const skipped: Plan["skipped"] = [];
  let route: Pandal[] = [];
  const must = [...ctx.mustSee].map((m) => PANDAL_BY_ID.get(m)!).sort((a, b) => haversine(start, a) - haversine(start, b));
  for (const p of must) {
    const ins = bestInsertion(route, p, ctx, simulate(route, ctx));
    if (ins) route = ins.route;
    else skipped.push({ id: p.id, name: p.name, reason: "too far to walk in your time window from this start" });
  }

  route = beamSearch(route, candidates, ctx);
  route = twoOpt(route, ctx);
  return { route, skipped };
}

const RELAX: Record<TripIntent["crowdTolerance"], TripIntent["crowdTolerance"] | null> = {
  low: "medium",
  medium: "high",
  high: null,
};

export function planRoute(intent: TripIntent, id = `plan-${intent.day}-${intent.startTime}`): Plan {
  const start = resolveStart(intent);
  const ctx: Ctx = {
    intent,
    start,
    startMin: parseClock(intent.startTime),
    pace: PACE_KMH[intent.group],
    maxLeg: MAX_LEG_M[intent.group],
    rest: REST_MIN[intent.group],
    mustSee: new Set(intent.mustSee.filter((m) => PANDAL_BY_ID.has(m))),
  };

  const warnings: string[] = [];
  let { route, skipped } = solve(ctx);

  // A one-stop "plan" is a bad evening. If the window is mostly empty, accept busier pandals and say so.
  let tolerance = RELAX[intent.crowdTolerance];
  while (route.length < 3 && tolerance && simulate(route, ctx).totalMin < intent.durationMinutes - 45) {
    const relaxed = solve({ ...ctx, intent: { ...intent, crowdTolerance: tolerance } });
    if (relaxed.route.length > route.length) {
      ({ route, skipped } = relaxed);
      warnings.push("Few calm pandals fit this time and place, so a couple of busier ones are included. Start earlier for shorter queues.");
      break;
    }
    tolerance = RELAX[tolerance];
  }

  const sim = simulate(route, ctx);
  const stops = sim.stops.map((s) => ({ ...s, reasons: explain(s, ctx) }));
  const last = stops.at(-1)?.pandal ?? start;

  const totals = {
    walkMeters: stops.reduce((a, s) => a + s.legMeters, 0),
    walkMin: stops.reduce((a, s) => a + s.legWalkMin, 0),
    queueMin: stops.reduce((a, s) => a + s.queueMin, 0),
    peakQueueMin: stops.reduce((a, s) => a + s.peakQueueMin, 0),
    dwellMin: stops.reduce((a, s) => a + s.dwellMin, 0),
    totalMin: Math.round(sim.totalMin),
    endMin: Math.round(ctx.startMin + sim.totalMin),
  };

  if (!stops.length) warnings.push("Nothing fits this window from here. Try a longer walk or a different start point.");
  if (intent.day === "dashami" && stops.some((s) => s.arriveMin >= 15 * 60))
    warnings.push("Dashami evening: some idols may already have left for immersion.");
  if ((intent.group === "elders" || intent.group === "kids") && totals.walkMeters > 4000)
    warnings.push("That's a long walk for this group. Hop on a rickshaw or auto for the longest stretch.");
  if (stops.some((s) => s.pandal.coord === "approx"))
    warnings.push("Some pins are approximate. Ask a local for the last few lanes; that's half the fun.");

  return { id, intent, start, stops, totals, endMetro: nearestStation(last), skipped, warnings };
}
