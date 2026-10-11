import { haversine } from "@/lib/engine/geo";
import type { LatLng } from "@/lib/engine/geo";
import type { Pandal, Plan } from "@/lib/types";
import type { ActiveWalk, Stamp, WalkRecord } from "@/lib/client/state";

export function arriveRadius(p: Pandal): number {
  return Math.max(p.radiusM, p.coord === "approx" ? 180 : 90);
}

export function isInside(you: LatLng, p: Pandal): boolean {
  return haversine(you, p) <= arriveRadius(p);
}

export function currentStop(plan: Plan, walk: ActiveWalk) {
  return plan.stops[walk.stopIndex] ?? null;
}

export function startWalk(plan: Plan, demo: boolean, now: number): ActiveWalk {
  return {
    planId: plan.id,
    startedAt: now,
    stopIndex: 0,
    stamps: [],
    skipped: [],
    meters: 0,
    time: { screenOnMs: 0, pocketMs: 0, hiddenMs: 0 },
    demo,
    arrivedAt: null,
    pocket: false,
  };
}

export function tickTime(
  walk: ActiveWalk,
  dtMs: number,
  pocket: boolean,
  hidden: boolean,
): ActiveWalk {
  const dt = Math.max(0, Math.min(dtMs, 4000));
  const time = { ...walk.time };
  if (pocket) time.pocketMs += dt;
  else if (hidden) time.hiddenMs += dt;
  else time.screenOnMs += dt;
  return { ...walk, time };
}

export function addTravel(walk: ActiveWalk, from: LatLng | null, to: LatLng): ActiveWalk {
  if (!from) return walk;
  const step = haversine(from, to);
  if (step < 1 || step > 250) return walk;
  return { ...walk, meters: walk.meters + step };
}

export function collectStamp(walk: ActiveWalk, stop: Plan["stops"][number], now: number): ActiveWalk {
  if (walk.stamps.some((s) => s.id === stop.pandal.id)) return walk;
  const stamp: Stamp = {
    id: stop.pandal.id,
    name: stop.pandal.name,
    bn: stop.pandal.bn,
    at: now,
    trivia: null,
  };
  return { ...walk, stamps: [...walk.stamps, stamp], arrivedAt: now };
}

export function markTrivia(walk: ActiveWalk, id: string, result: "right" | "wrong"): ActiveWalk {
  return {
    ...walk,
    stamps: walk.stamps.map((s) => (s.id === id ? { ...s, trivia: result } : s)),
  };
}

export function advance(walk: ActiveWalk): ActiveWalk {
  return { ...walk, stopIndex: walk.stopIndex + 1, arrivedAt: null };
}

export function skipCurrent(walk: ActiveWalk, plan: Plan): ActiveWalk {
  const stop = currentStop(plan, walk);
  if (!stop) return walk;
  return advance({ ...walk, skipped: [...walk.skipped, stop.pandal.id] });
}

export function isFinished(plan: Plan, walk: ActiveWalk): boolean {
  return walk.stopIndex >= plan.stops.length;
}

export function finishWalk(plan: Plan, walk: ActiveWalk, model: string | null, now: number): WalkRecord {
  return {
    id: `walk-${now.toString(36)}`,
    planId: plan.id,
    day: plan.intent.day,
    startName: plan.start.name,
    startedAt: walk.startedAt,
    endedAt: now,
    plannedStops: plan.stops.length,
    stamps: walk.stamps,
    meters: walk.meters,
    time: walk.time,
    queueSavedMin: Math.max(0, plan.totals.peakQueueMin - plan.totals.queueMin),
    demo: walk.demo,
    model,
  };
}

export function eyesOffMs(t: ActiveWalk["time"]): number {
  return t.pocketMs + t.hiddenMs;
}

export function eyesOnRatio(t: ActiveWalk["time"]): number {
  const total = t.screenOnMs + eyesOffMs(t);
  return total <= 0 ? 0 : t.screenOnMs / total;
}
