import { formatClock, formatDuration, parseClock } from "@/lib/engine/time";
import type { Plan } from "@/lib/types";

/** Used when no local model is running: plain, factual, still useful. */
export function templateNarration(plan: Plan): string {
  if (!plan.stops.length) {
    return "Nothing fits that window from there. Give yourself a little more time or pick a start closer to the pandals you want.";
  }
  const [first, ...rest] = plan.stops;
  const parts = [
    `Start at ${plan.start.name} at ${formatClock(parseClock(plan.intent.startTime))} and walk ${first.legMeters} m to ${first.pandal.name}.`,
  ];
  if (first.peakQueueMin - first.queueMin >= 10) {
    parts.push(`It goes first because the queue should be about ${first.queueMin} minutes then, against roughly ${first.peakQueueMin} at 9 pm.`);
  }
  if (rest.length) parts.push(`Then ${rest.map((s) => s.pandal.name).join(", then ")}.`);
  parts.push(
    `That's ${(plan.totals.walkMeters / 1000).toFixed(1)} km on foot over ${formatDuration(plan.totals.totalMin)}, with about ${plan.totals.queueMin} minutes in queues.`,
  );
  if (plan.endMetro) parts.push(`You finish ${plan.endMetro.meters} m from ${plan.endMetro.name}.`);
  parts.push("Now pocket the phone. The dhak will tell you when you've arrived.");
  return parts.join(" ");
}
