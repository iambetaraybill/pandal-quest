import { describe, expect, it } from "vitest";
import { finishWalk, isInside, startWalk, tickTime } from "@/lib/client/walk-logic";
import { PANDAL_BY_ID } from "@/lib/data/pandals";
import { defaultIntent } from "@/lib/engine/intent";
import { planRoute } from "@/lib/engine/planner";

describe("walk", () => {
  const plan = planRoute({ ...defaultIntent(), startPlaceId: "shyambazar", durationMinutes: 180, mustSee: ["kumartuli-quarter"] });

  it("starts at the first stop with empty stamps", () => {
    const w = startWalk(plan, true, 1_000);
    expect(w.stopIndex).toBe(0);
    expect(w.stamps).toEqual([]);
    expect(w.demo).toBe(true);
  });

  it("treats approximate pins as a wide arrival zone", () => {
    const kumar = PANDAL_BY_ID.get("kumartuli-quarter")!;
    expect(isInside({ lat: kumar.lat + 0.001, lng: kumar.lng }, kumar)).toBe(true);
  });

  it("counts pocket time as eyes-off", () => {
    const w = tickTime(startWalk(plan, false, 1), 2000, true, false);
    expect(w.time.pocketMs).toBe(2000);
    expect(w.time.screenOnMs).toBe(0);
  });

  it("writes a receipt with queue minutes saved from the plan", () => {
    const rec = finishWalk(plan, startWalk(plan, false, 1), "gemma4:e2b", 2);
    expect(rec.plannedStops).toBe(plan.stops.length);
    expect(rec.queueSavedMin).toBe(Math.max(0, plan.totals.peakQueueMin - plan.totals.queueMin));
    expect(rec.model).toBe("gemma4:e2b");
  });
});
