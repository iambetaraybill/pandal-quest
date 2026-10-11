"use client";

import { Check, Loader2, MessageSquareText, PenLine, Route } from "lucide-react";
import { useNow } from "@/lib/client/clock";
import type { Stage } from "@/lib/client/plan-client";
import { cn } from "@/lib/utils";

const STAGES: { id: Stage; title: string; detail: (ai: boolean) => string; icon: typeof Route }[] = [
  {
    id: "understanding",
    title: "Reading your request",
    detail: (ai) => (ai ? "Gemma turns your words into a typed plan request" : "The rule-based parser picks out day, place and group"),
    icon: MessageSquareText,
  },
  {
    id: "planning",
    title: "Solving the route",
    detail: () => "Beam search over every pandal's crowd clock",
    icon: Route,
  },
  {
    id: "writing",
    title: "Writing your guide",
    detail: (ai) => (ai ? "Gemma explains the order using the solver's numbers" : "Filling in the plain-text guide"),
    icon: PenLine,
  },
];

export function StageSteps({
  stage,
  stageAt,
  includeUnderstanding,
  ai,
}: {
  stage: Stage | "done";
  stageAt: number;
  includeUnderstanding: boolean;
  ai: boolean;
}) {
  const now = useNow();
  const steps = includeUnderstanding ? STAGES : STAGES.slice(1);
  const activeIndex = stage === "done" ? steps.length : steps.findIndex((s) => s.id === stage);

  return (
    <ol className="grid gap-2 sm:grid-cols-3" aria-live="polite">
      {steps.map((s, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
        const Icon = s.icon;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
              state === "active" && "border-sindoor/40 bg-sindoor/5",
              state === "todo" && "opacity-55",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground",
                state === "done" && "bg-grass text-white",
                state === "active" && "bg-sindoor text-primary-foreground",
              )}
            >
              {state === "done" ? (
                <Check className="size-4" />
              ) : state === "active" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {s.title}
                {state === "active" && now > 0 && (
                  <span className="ml-2 font-normal text-muted-foreground tabular">
                    {Math.max(0, Math.round((now - stageAt) / 1000))} s
                  </span>
                )}
              </p>
              <p className="text-xs text-pretty text-muted-foreground">{s.detail(ai)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
