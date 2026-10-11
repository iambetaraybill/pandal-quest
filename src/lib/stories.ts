import "server-only";
import { PANDAL_BY_ID } from "@/lib/data/pandals";
import pregenerated from "@/lib/data/stories.generated.json";
import { chatJSON, MODEL } from "@/lib/ai/ollama";
import { STORY_SCHEMA, storyMessages } from "@/lib/ai/prompts";
import { fallbackStory, polishStory, sanitizeStory } from "@/lib/story-fallback";
import type { StoryPack } from "@/lib/types";

type Lang = "en" | "bn";
const PRE = pregenerated as Record<string, Partial<Record<Lang, StoryPack>>>;
const memory = new Map<string, StoryPack>();

export async function generateStory(id: string, lang: Lang): Promise<StoryPack | null> {
  const p = PANDAL_BY_ID.get(id);
  if (!p) return null;
  const { data } = await chatJSON<unknown>(storyMessages(p, lang), STORY_SCHEMA, { temperature: 0.6 });
  return sanitizeStory(data, p, MODEL, lang);
}

/** Pre-generated Gemma story → this server's cache → live Gemma (optional) → curated fallback. */
export async function getStory(id: string, lang: Lang, { live }: { live: boolean }): Promise<StoryPack | null> {
  const p = PANDAL_BY_ID.get(id);
  if (!p) return null;
  const pre = PRE[id]?.[lang];
  if (pre) return polishStory(pre, p);
  const key = `${id}:${lang}`;
  const cached = memory.get(key);
  if (cached) return cached;
  if (live) {
    try {
      const story = await generateStory(id, lang);
      if (story) {
        memory.set(key, story);
        return story;
      }
    } catch {
      // Fall through to the curated card; a walk must never stall on the model.
    }
  }
  return lang === "en" ? fallbackStory(p) : (PRE[id]?.en ?? fallbackStory(p));
}
