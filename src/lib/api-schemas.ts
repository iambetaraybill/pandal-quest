import { z } from "zod";
import { CROWD_TOLERANCES, GROUPS, INTERESTS, PUJA_DAY_IDS } from "@/lib/types";

export const IntentInput = z
  .object({
    startPlaceId: z.string().max(60),
    startCoords: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable(),
    day: z.enum(PUJA_DAY_IDS),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    durationMinutes: z.number().int().min(45).max(480),
    group: z.enum(GROUPS),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length),
    crowdTolerance: z.enum(CROWD_TOLERANCES),
    mustSee: z.array(z.string().max(60)).max(10),
    avoid: z.array(z.string().max(60)).max(20),
    notes: z.string().max(280).optional(),
  })
  .partial();

export const PlanRequest = z.object({
  text: z.string().max(600).optional(),
  intent: IntentInput.optional(),
  lang: z.enum(["en", "bn"]).default("en"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reparse: z.boolean().default(true),
  narrate: z.boolean().default(true),
});

export const StoriesRequest = z.object({
  ids: z.array(z.string().max(60)).min(1).max(12),
  lang: z.enum(["en", "bn"]).default("en"),
});

export const AskRequest = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(800) }))
    .min(1)
    .max(16),
  day: z.enum(PUJA_DAY_IDS).default("saptami"),
  time: z.string().regex(/^\d{2}:\d{2}$/).default("19:00"),
});
