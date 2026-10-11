"use client";

import { templateNarration } from "@/lib/ai/narrate";
import { defaultIntent, parseIntentRules } from "@/lib/engine/intent";
import { planRoute } from "@/lib/engine/planner";
import { readNdjson } from "@/lib/ndjson";
import type { AiStats, Plan, TripIntent } from "@/lib/types";

export type Stage = "understanding" | "planning" | "writing";

export type PlanEvent =
  | { type: "ai"; ready: boolean; model: string; host: string }
  | { type: "status"; stage: Stage }
  | { type: "raw_intent"; raw: unknown }
  | { type: "intent"; intent: TripIntent; source: "gemma" | "rules"; stats?: AiStats }
  | { type: "plan"; plan: Plan; ms: number }
  | { type: "token"; text: string }
  | { type: "narration"; source: "gemma"; stats: AiStats }
  | { type: "narration"; source: "template"; text: string }
  | { type: "warning"; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface PlanBody {
  text?: string;
  intent?: Partial<TripIntent>;
  lang?: "en" | "bn";
  today?: string;
  reparse?: boolean;
  narrate?: boolean;
}

/** The same planner, run in the browser, for when the laptop or the network is gone. */
function runInBrowser(body: PlanBody, onEvent: (e: PlanEvent) => void) {
  const base: TripIntent = { ...defaultIntent(body.today), ...body.intent } as TripIntent;
  onEvent({ type: "ai", ready: false, model: "", host: "browser" });
  let intent = base;
  if (body.text?.trim() && body.reparse !== false) {
    onEvent({ type: "status", stage: "understanding" });
    intent = parseIntentRules(body.text, base);
    if (intent.startPlaceId !== base.startPlaceId) intent = { ...intent, startCoords: null };
    onEvent({ type: "intent", intent, source: "rules" });
  }
  onEvent({ type: "status", stage: "planning" });
  const t0 = performance.now();
  const plan = planRoute(intent, `plan-local-${Date.now().toString(36)}`);
  onEvent({ type: "plan", plan, ms: Math.round(performance.now() - t0) });
  if (body.narrate !== false) onEvent({ type: "narration", source: "template", text: templateNarration(plan) });
  onEvent({
    type: "warning",
    message: "Couldn't reach the Pandal Quest server, so the planner ran in your browser with the rule-based parser.",
  });
  onEvent({ type: "done" });
}

export async function requestPlan(
  body: PlanBody,
  onEvent: (e: PlanEvent) => void,
  signal?: AbortSignal,
): Promise<"server" | "browser"> {
  let received = 0;
  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`Planner returned ${res.status}`);
    await readNdjson<PlanEvent>(res, (e) => {
      received++;
      onEvent(e);
    });
    return "server";
  } catch (e) {
    if (signal?.aborted) throw e;
    if (received > 0) {
      onEvent({ type: "error", message: e instanceof Error ? e.message : String(e) });
      onEvent({ type: "done" });
      return "server";
    }
    runInBrowser(body, onEvent);
    return "browser";
  }
}
