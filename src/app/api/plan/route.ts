import { chatJSON, chatStream, MODEL } from "@/lib/ai/ollama";
import { templateNarration } from "@/lib/ai/narrate";
import { INTENT_SCHEMA, intentMessages, narrationMessages } from "@/lib/ai/prompts";
import { aiReady, aiStatus } from "@/lib/ai/status";
import { PlanRequest } from "@/lib/api-schemas";
import { defaultIntent, intentFromRaw, parseIntentRules, type RawIntent } from "@/lib/engine/intent";
import { planRoute } from "@/lib/engine/planner";
import { ndjsonResponse } from "@/lib/ndjson";
import type { TripIntent } from "@/lib/types";

export async function POST(req: Request) {
  const parsed = PlanRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  const body = parsed.data;
  const today = body.today ?? "2026-10-11";

  return ndjsonResponse(async (send) => {
    const status = await aiStatus();
    const useAi = aiReady(status);
    send({ type: "ai", ready: useAi, model: MODEL, host: status.host });

    const base: TripIntent = { ...defaultIntent(today), ...body.intent } as TripIntent;
    let intent = base;
    const text = body.text?.trim();

    if (text && body.reparse) {
      send({ type: "status", stage: "understanding" });
      let source: "gemma" | "rules" = "rules";
      let stats;
      if (useAi) {
        try {
          const res = await chatJSON<RawIntent>(intentMessages(text, today), INTENT_SCHEMA);
          intent = intentFromRaw(res.data, base);
          stats = res.stats;
          source = "gemma";
          send({ type: "raw_intent", raw: res.data });
        } catch (e) {
          send({ type: "warning", message: `Model unavailable (${(e as Error).message}); used the rule-based parser.` });
          intent = parseIntentRules(text, base);
        }
      } else {
        intent = parseIntentRules(text, base);
      }
      if (intent.startPlaceId !== base.startPlaceId) intent = { ...intent, startCoords: null };
      send({ type: "intent", intent, source, stats });
    }

    send({ type: "status", stage: "planning" });
    const t0 = Date.now();
    const plan = planRoute(intent, `plan-${Date.now().toString(36)}`);
    send({ type: "plan", plan, ms: Date.now() - t0 });

    if (!body.narrate) return;
    send({ type: "status", stage: "writing" });
    if (useAi && plan.stops.length) {
      try {
        for await (const chunk of chatStream(narrationMessages(plan, body.lang))) {
          if ("token" in chunk) send({ type: "token", text: chunk.token });
          else send({ type: "narration", source: "gemma", stats: chunk.stats });
        }
        return;
      } catch (e) {
        send({ type: "warning", message: `Narration fell back to a template (${(e as Error).message}).` });
      }
    }
    send({ type: "narration", source: "template", text: templateNarration(plan) });
  });
}
