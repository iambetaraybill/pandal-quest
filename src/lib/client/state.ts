"use client";

import { createStore } from "@/lib/client/store";
import type { AiStats, Plan, PujaDayId } from "@/lib/types";

export interface SavedPlan {
  plan: Plan;
  text: string;
  intentSource: "gemma" | "rules" | "manual";
  /** Gemma's JSON before validation, shown so people can see what the model actually said. */
  raw: unknown;
  narration: string;
  narrationSource: "gemma" | "template";
  narrationStale: boolean;
  stats: { intent: AiStats | null; narration: AiStats | null };
  solveMs: number | null;
  notices: string[];
  model: string | null;
  mode: "server" | "browser";
  savedAt: number;
}

export interface Stamp {
  id: string;
  name: string;
  bn: string;
  at: number;
  trivia: "right" | "wrong" | null;
}

export interface WalkTime {
  screenOnMs: number;
  pocketMs: number;
  hiddenMs: number;
}

export interface ActiveWalk {
  planId: string;
  startedAt: number;
  stopIndex: number;
  stamps: Stamp[];
  skipped: string[];
  meters: number;
  time: WalkTime;
  demo: boolean;
  arrivedAt: number | null;
  pocket: boolean;
}

export interface WalkRecord {
  id: string;
  planId: string;
  day: PujaDayId;
  startName: string;
  startedAt: number;
  endedAt: number;
  plannedStops: number;
  stamps: Stamp[];
  meters: number;
  time: WalkTime;
  queueSavedMin: number;
  demo: boolean;
  model: string | null;
}

export interface Prefs {
  voice: boolean;
  dhak: boolean;
  autoPocket: boolean;
  lang: "en" | "bn";
}

const EMPTY_HISTORY: WalkRecord[] = [];
const DEFAULT_PREFS: Prefs = { voice: true, dhak: true, autoPocket: true, lang: "en" };

export const planStore = createStore<SavedPlan | null>("pq:plan:v1", null);
export const walkStore = createStore<ActiveWalk | null>("pq:walk:v1", null);
export const historyStore = createStore<WalkRecord[]>("pq:history:v1", EMPTY_HISTORY);
export const prefsStore = createStore<Prefs>("pq:prefs:v1", DEFAULT_PREFS);
