"use client";

import { PANDAL_BY_ID } from "@/lib/data/pandals";
import pregenerated from "@/lib/data/stories.generated.json";
import { fallbackStory, polishStory } from "@/lib/story-fallback";
import type { StoryPack } from "@/lib/types";

type Lang = "en" | "bn";
const PRE = pregenerated as Record<string, Partial<Record<Lang, StoryPack>>>;

/**
 * Story cards ship inside the app bundle (generated ahead of time by Gemma), so a walk
 * needs no network at all. Missing cards fall back to a curated one.
 */
export function storyFor(id: string, lang: Lang = "en"): StoryPack | null {
  const p = PANDAL_BY_ID.get(id);
  const pre = PRE[id]?.[lang] ?? PRE[id]?.en;
  if (pre) return p ? polishStory(pre, p) : pre;
  return p ? fallbackStory(p) : null;
}

export function hasGemmaStory(id: string, lang: Lang = "en"): boolean {
  return Boolean(PRE[id]?.[lang]);
}
