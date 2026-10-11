import "server-only";
import { health, type Health } from "@/lib/ai/ollama";

let cached: { at: number; value: Health } | null = null;

/** Health is checked on every plan; cache it briefly so a dead Ollama doesn't add latency each time. */
export async function aiStatus(): Promise<Health> {
  if (cached && Date.now() - cached.at < 10_000) return cached.value;
  const value = await health();
  cached = { at: Date.now(), value };
  return value;
}

export function aiReady(h: Health): boolean {
  return h.reachable && h.modelPresent && process.env.PANDAL_QUEST_DISABLE_AI !== "1";
}
