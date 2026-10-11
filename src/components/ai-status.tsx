"use client";

import { useSyncExternalStore } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { prettyModel } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AiHealth {
  reachable: boolean;
  model: string;
  modelPresent: boolean;
  version?: string;
  host: string;
  ready: boolean;
}

export type HealthState =
  | { status: "loading" }
  | { status: "ok"; health: AiHealth }
  | { status: "unreachable" };

const LOADING: HealthState = { status: "loading" };
let state: HealthState = LOADING;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

async function poll() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    state = { status: "ok", health: (await res.json()) as AiHealth };
  } catch {
    state = { status: "unreachable" };
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void poll();
    timer = setInterval(poll, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) clearInterval(timer);
  };
}

export function useAiHealth(): HealthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}

export function refreshAiHealth() {
  void poll();
}

export function describeHealth(h: HealthState): { tone: "ok" | "warn" | "off" | "wait"; label: string; detail: string } {
  if (h.status === "loading") return { tone: "wait", label: "Checking model", detail: "Looking for a local model…" };
  if (h.status === "unreachable")
    return {
      tone: "off",
      label: "Offline",
      detail: "Can't reach the Pandal Quest server. Planning runs in your browser with the rule-based parser.",
    };
  const { health } = h;
  if (health.ready)
    return {
      tone: "ok",
      label: `${prettyModel(health.model)} · local`,
      detail: `Running on Ollama ${health.version ?? ""} at ${health.host.replace(/^https?:\/\//, "")}. Nothing you type leaves this machine.`,
    };
  if (health.reachable)
    return {
      tone: "warn",
      label: "Rules mode",
      detail: `Ollama is running but ${health.model} isn't pulled yet. Run: ollama pull ${health.model}`,
    };
  return {
    tone: "warn",
    label: "Rules mode",
    detail: "No local model found. Start Ollama to let Gemma parse requests and write your guide. Everything else still works.",
  };
}

const DOT: Record<ReturnType<typeof describeHealth>["tone"], string> = {
  ok: "bg-grass shadow-[0_0_0_3px_color-mix(in_oklch,var(--grass),transparent_75%)]",
  warn: "bg-marigold",
  off: "bg-muted-foreground/50",
  wait: "bg-muted-foreground/40 animate-pulse",
};

export function AiPill({ className }: { className?: string }) {
  const d = describeHealth(useAiHealth());
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-2 rounded-full border bg-card px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted",
              className,
            )}
          />
        }
      >
        <span className={cn("size-2 rounded-full", DOT[d.tone])} aria-hidden />
        <span className="max-w-36 truncate">{d.label}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-pretty">
        {d.detail}
      </TooltipContent>
    </Tooltip>
  );
}
