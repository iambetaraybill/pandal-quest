import { describe, expect, it } from "vitest";
import { PANDALS, PANDAL_BY_ID } from "@/lib/data/pandals";
import { PLACES } from "@/lib/data/places";
import { crowdLevel, queueMinutes } from "@/lib/engine/crowd";
import { bearing, compassWord, haversine } from "@/lib/engine/geo";
import { defaultIntent, intentFromRaw, parseIntentRules } from "@/lib/engine/intent";
import { matchPandal, matchPlace } from "@/lib/engine/match";
import { planRoute } from "@/lib/engine/planner";
import { formatClock, parseClock } from "@/lib/engine/time";

describe("dataset", () => {
  it("has unique ids and plausible Kolkata coordinates", () => {
    const ids = new Set(PANDALS.map((p) => p.id));
    expect(ids.size).toBe(PANDALS.length);
    for (const p of [...PANDALS, ...PLACES]) {
      expect(p.lat).toBeGreaterThan(22.4);
      expect(p.lat).toBeLessThan(22.7);
      expect(p.lng).toBeGreaterThan(88.25);
      expect(p.lng).toBeLessThan(88.5);
    }
  });
});

describe("geo", () => {
  it("measures Shyambazar to Esplanade at roughly 4.5 km", () => {
    const d = haversine({ lat: 22.60133, lng: 88.3725 }, { lat: 22.56361, lng: 88.35121 });
    expect(d).toBeGreaterThan(4300);
    expect(d).toBeLessThan(4900);
  });
  it("points south from Shyambazar to Esplanade", () => {
    const b = bearing({ lat: 22.60133, lng: 88.3725 }, { lat: 22.56361, lng: 88.35121 });
    expect(compassWord(b)).toMatch(/south/);
  });
});

describe("crowd clock", () => {
  const sreebhumi = PANDAL_BY_ID.get("sreebhumi")!;
  it("peaks at night and calms before dawn", () => {
    const night = queueMinutes(sreebhumi, "ashtami", 21 * 60 + 30);
    const dawn = queueMinutes(sreebhumi, "ashtami", 5 * 60);
    const afternoon = queueMinutes(sreebhumi, "ashtami", 15 * 60);
    expect(night).toBeGreaterThan(afternoon);
    expect(afternoon).toBeGreaterThan(dawn);
    expect(crowdLevel(night)).toBe("packed");
  });
  it("is lighter before Pujo than on Ashtami", () => {
    expect(queueMinutes(sreebhumi, "pre", 21 * 60)).toBeLessThan(queueMinutes(sreebhumi, "ashtami", 21 * 60));
  });
});

describe("time helpers", () => {
  it("round-trips clock strings", () => {
    expect(parseClock("18:40")).toBe(1120);
    expect(formatClock(1120)).toBe("6:40 pm");
    expect(formatClock(25 * 60 + 5)).toBe("1:05 am");
  });
});

describe("matching", () => {
  it("resolves colloquial names", () => {
    expect(matchPandal("lebutala")?.id).toBe("santosh-mitra-square");
    expect(matchPandal("Md. Ali Park")?.id).toBe("md-ali-park");
    expect(matchPandal("Sribhumi")?.id).toBe("sreebhumi");
    expect(matchPlace("shyambazar metro")?.id).toBe("shyambazar");
    expect(matchPandal("some made up pandal")).toBeNull();
  });
});

describe("rule-based intent", () => {
  it("parses a typical request", () => {
    const i = parseIntentRules(
      "Saptami evening 6pm from Shyambazar with my grandma, love bonedi bari pujas, hate queues, 3 hours, must see Kumartuli",
    );
    expect(i.day).toBe("saptami");
    expect(i.startTime).toBe("18:00");
    expect(i.durationMinutes).toBe(180);
    expect(i.group).toBe("elders");
    expect(i.crowdTolerance).toBe("low");
    expect(i.interests).toContain("bonedi");
    expect(i.startPlaceId).toBe("shyambazar");
    expect(i.mustSee).toContain("kumartuli-quarter");
  });
});

describe("model output validation", () => {
  it("drops hallucinated pandals and invalid enums", () => {
    const i = intentFromRaw(
      { day: "funday", group: "elders", mustSee: ["Imaginary Palace Puja", "Bagbazar"], interests: ["heritage", "rollercoasters"] },
      defaultIntent(),
    );
    expect(i.day).toBe(defaultIntent().day);
    expect(i.group).toBe("elders");
    expect(i.mustSee).toEqual(["bagbazar"]);
    expect(i.interests).toEqual(["heritage"]);
  });
});

describe("planner", () => {
  const base = { ...defaultIntent(), day: "saptami" as const, startPlaceId: "shyambazar", startTime: "18:00" };

  it("builds a walkable North Kolkata route that respects the time window", () => {
    const plan = planRoute({ ...base, durationMinutes: 180, interests: ["heritage", "bonedi", "traditional"] });
    expect(plan.stops.length).toBeGreaterThanOrEqual(3);
    expect(plan.totals.totalMin).toBeLessThanOrEqual(190);
    for (const s of plan.stops) expect(s.pandal.area).toBe("North");
    expect(plan.endMetro).not.toBeNull();
  });

  it("includes a must-see stop", () => {
    const plan = planRoute({ ...base, mustSee: ["kumartuli-quarter"] });
    expect(plan.stops.map((s) => s.pandal.id)).toContain("kumartuli-quarter");
  });

  it("reports must-see stops that cannot fit", () => {
    const plan = planRoute({ ...base, durationMinutes: 90, group: "elders", mustSee: ["sabarna-roy-choudhury"] });
    expect(plan.skipped.map((s) => s.id)).toContain("sabarna-roy-choudhury");
  });

  it("queues less than visiting the same stops at peak", () => {
    const plan = planRoute({ ...base, startTime: "16:00", crowdTolerance: "low", interests: ["famous", "theme"] });
    expect(plan.totals.queueMin).toBeLessThan(plan.totals.peakQueueMin);
  });

  it("never schedules avoided pandals", () => {
    const plan = planRoute({ ...base, startPlaceId: "gariahat", avoid: ["ekdalia-evergreen", "singhi-park"] });
    const ids = plan.stops.map((s) => s.pandal.id);
    expect(ids).not.toContain("ekdalia-evergreen");
    expect(ids).not.toContain("singhi-park");
  });
});
