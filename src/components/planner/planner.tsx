"use client";

import { ArrowRight, Footprints, Loader2, MessagesSquare, Sparkles, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AskDhaki } from "@/components/ask-dhaki";
import { HowItWorks } from "@/components/planner/how-it-works";
import { IntentEditor } from "@/components/planner/intent-editor";
import { NarrationCard } from "@/components/planner/narration-card";
import { PlanSummary } from "@/components/planner/plan-summary";
import { StageSteps } from "@/components/planner/stage-steps";
import { StopList } from "@/components/planner/stop-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { localIsoDate } from "@/lib/client/clock";
import { requestPlan, type PlanBody, type Stage } from "@/lib/client/plan-client";
import { planStore, prefsStore, type SavedPlan } from "@/lib/client/state";
import { useStore } from "@/lib/client/store";
import { PUJA_DAY_BY_ID } from "@/lib/data/calendar";
import { defaultIntent } from "@/lib/engine/intent";
import { haversine } from "@/lib/engine/geo";
import { matchPandal } from "@/lib/engine/match";
import { planRoute } from "@/lib/engine/planner";
import { formatClock, parseClock } from "@/lib/engine/time";
import { prettyModel } from "@/lib/format";
import type { Plan, TripIntent } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/route-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const EXAMPLES = [
  {
    label: "Parents, short walks",
    text: "Taking my parents from Shyambazar on Saptami around 5 pm. Short walks and no long queues please, and they really want to see Kumartuli.",
  },
  {
    label: "Famous theme pandals",
    text: "Ashtami night with friends, starting at Kalighat metro at 8. We want the big famous theme pandals in the south and don't mind crowds.",
  },
  {
    label: "Solo, old north Kolkata",
    text: "Going solo on Navami afternoon from College Street, about 3 hours. I love old heritage pujas, bonedi baris and quiet lanes.",
  },
  {
    label: "Kids, art pandals",
    text: "Shashthi evening with two kids near Gariahat for 2 hours. Art pandals, nothing too crowded.",
  },
];

const KOLKATA = { lat: 22.5726, lng: 88.3639 };

interface Live {
  stage: Stage | "done";
  stageAt: number;
  includeUnderstanding: boolean;
  text: string;
  ai: { ready: boolean; model: string } | null;
  intentSource: SavedPlan["intentSource"] | null;
  raw: unknown;
  plan: Plan | null;
  narration: string;
  narrationSource: "gemma" | "template" | null;
  stats: SavedPlan["stats"];
  solveMs: number | null;
  notices: string[];
  error: string | null;
}

function droppedNames(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as { mustSee?: unknown; avoid?: unknown };
  const names = [r.mustSee, r.avoid].flatMap((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []));
  return names.filter((n) => n.trim() && !matchPandal(n));
}

export function Planner() {
  const saved = useStore(planStore);
  const prefs = useStore(prefsStore);
  const [draft, setDraft] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [locating, setLocating] = useState(false);
  const [dhakiOpen, setDhakiOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const text = draft ?? saved?.text ?? "";
  const running = live !== null && live.stage !== "done";
  const plan = live ? live.plan : (saved?.plan ?? null);

  async function run(body: PlanBody, base: SavedPlan | null) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const parsing = Boolean(body.text?.trim()) && body.reparse !== false;
    const acc: Live = {
      stage: parsing ? "understanding" : "planning",
      stageAt: Date.now(),
      includeUnderstanding: parsing,
      text: body.text ?? base?.text ?? "",
      ai: null,
      intentSource: parsing ? null : (base?.intentSource ?? "manual"),
      raw: parsing ? null : (base?.raw ?? null),
      plan: null,
      narration: "",
      narrationSource: null,
      stats: { intent: parsing ? null : (base?.stats.intent ?? null), narration: null },
      solveMs: null,
      notices: [],
      error: null,
    };
    setLive({ ...acc });
    let scrolled = false;

    try {
      const mode = await requestPlan(
        body,
        (e) => {
          switch (e.type) {
            case "ai":
              acc.ai = { ready: e.ready, model: e.model };
              break;
            case "status":
              acc.stage = e.stage;
              acc.stageAt = Date.now();
              break;
            case "raw_intent":
              acc.raw = e.raw;
              break;
            case "intent":
              acc.intentSource = e.source;
              acc.stats = { ...acc.stats, intent: e.stats ?? null };
              break;
            case "plan":
              acc.plan = e.plan;
              acc.solveMs = e.ms;
              if (!scrolled && window.innerWidth < 1024) {
                scrolled = true;
                requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }
              break;
            case "token":
              acc.narration += e.text;
              acc.narrationSource = "gemma";
              break;
            case "narration":
              if (e.source === "template") {
                acc.narration = e.text;
                acc.narrationSource = "template";
              } else {
                acc.narrationSource = "gemma";
                acc.stats = { ...acc.stats, narration: e.stats };
              }
              break;
            case "warning":
              acc.notices = [...acc.notices, e.message];
              break;
            case "error":
              acc.error = e.message;
              break;
            case "done":
              acc.stage = "done";
              break;
          }
          setLive({ ...acc });
        },
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      if (acc.plan) {
        planStore.set({
          plan: acc.plan,
          text: acc.text,
          intentSource: acc.intentSource ?? "manual",
          raw: acc.raw,
          narration: acc.narration.trim(),
          narrationSource: acc.narrationSource ?? "template",
          narrationStale: false,
          stats: acc.stats,
          solveMs: acc.solveMs,
          notices: acc.notices,
          model: acc.ai?.ready ? acc.ai.model : null,
          mode,
          savedAt: Date.now(),
        });
        setLive(null);
        setDraft(null);
      } else {
        setLive({ ...acc, stage: "done", error: acc.error ?? "The planner didn't return a route." });
      }
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setLive({ ...acc, stage: "done", error: e instanceof Error ? e.message : String(e) });
    }
  }

  function onPlan(nextText = text) {
    if (!nextText.trim()) {
      toast("Tell me about your evening first, or tap one of the examples.");
      return;
    }
    const today = localIsoDate(Date.now());
    const base: Partial<TripIntent> = { ...defaultIntent(today), startCoords: saved?.plan.intent.startCoords ?? null };
    void run({ text: nextText.trim(), intent: base, today, lang: prefs.lang, reparse: true, narrate: true }, saved);
  }

  function onIntentChange(next: TripIntent) {
    if (!saved) return;
    const t0 = performance.now();
    const fresh = planRoute(next, `plan-${Date.now().toString(36)}`);
    const solveMs = Math.round(performance.now() - t0);
    planStore.set({ ...saved, plan: fresh, intentSource: "manual", narrationStale: true, solveMs, savedAt: Date.now() });
  }

  function onRewrite() {
    if (!saved) return;
    void run(
      { intent: saved.plan.intent, today: localIsoDate(Date.now()), lang: prefs.lang, reparse: false, narrate: true },
      saved,
    );
  }

  function onLocate() {
    if (!saved) return;
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (haversine(here, KOLKATA) > 45_000) {
          toast("You look to be outside Kolkata, so I kept the start point you had.", {
            description: "Pick a start from the list, or try it again once you're in the city.",
          });
          return;
        }
        onIntentChange({ ...saved.plan.intent, startCoords: here });
        toast.success("Starting from where you are.");
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get a location fix.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  const view = live
    ? {
        narration: live.narration,
        narrationSource: live.narrationSource,
        stats: live.stats,
        intentSource: live.intentSource,
        raw: live.raw,
        notices: live.notices,
        solveMs: live.solveMs,
        model: live.ai?.ready ? live.ai.model : null,
        stale: false,
        mode: "server" as const,
      }
    : saved
      ? {
          narration: saved.narration,
          narrationSource: saved.narrationSource,
          stats: saved.stats,
          intentSource: saved.intentSource,
          raw: saved.raw,
          notices: saved.notices,
          solveMs: saved.solveMs,
          model: saved.model,
          stale: saved.narrationStale,
          mode: saved.mode,
        }
      : null;

  const day = plan ? PUJA_DAY_BY_ID.get(plan.intent.day) : null;
  const dropped = droppedNames(view?.raw);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,410px)_minmax(0,1fr)] lg:gap-8">
      <aside className="grid content-start gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pb-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-semibold">Describe your evening</CardTitle>
            <CardDescription>Day, where you&apos;ll start, who&apos;s coming, what you love, what you can&apos;t stand.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={text}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onPlan();
              }}
              rows={5}
              maxLength={600}
              placeholder="Saptami evening with my parents from Shyambazar metro. They can't stand long queues, but Kumartuli is a must."
              className="min-h-28 resize-none text-[15px] leading-relaxed"
              aria-label="Describe your evening"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  disabled={running}
                  onClick={() => {
                    setDraft(ex.text);
                    onPlan(ex.text);
                  }}
                  className="rounded-full border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-sindoor/50 hover:bg-sindoor/5 hover:text-foreground disabled:opacity-50"
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <ToggleGroup
                value={[prefs.lang]}
                onValueChange={(v) => v[0] && prefsStore.set({ ...prefs, lang: v[0] as "en" | "bn" })}
                spacing={0}
                variant="outline"
                size="sm"
                aria-label="Guide language"
              >
                <ToggleGroupItem value="en" className="aria-pressed:bg-secondary">
                  English
                </ToggleGroupItem>
                <ToggleGroupItem value="bn" className="font-bn aria-pressed:bg-secondary">
                  বাংলা
                </ToggleGroupItem>
              </ToggleGroup>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDhakiOpen(true)}>
                  <MessagesSquare /> Ask Dhaki
                </Button>
                <Button onClick={() => onPlan()} disabled={running} className="px-3.5">
                  {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {running ? "Planning…" : "Plan my walk"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {saved && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg font-semibold">Fine-tune</CardTitle>
              <CardDescription>
                {saved.intentSource === "gemma"
                  ? "Gemma filled these in from your words."
                  : saved.intentSource === "rules"
                    ? "The rule-based parser filled these in."
                    : "Your settings."}{" "}
                Change anything and the route re-solves instantly, right in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntentEditor
                intent={saved.plan.intent}
                onChange={onIntentChange}
                onLocate={onLocate}
                locating={locating}
                disabled={running}
              />
            </CardContent>
          </Card>
        )}
      </aside>

      <div ref={resultsRef} className="grid min-w-0 scroll-mt-24 content-start gap-5">
        {live && live.stage !== "done" && (
          <StageSteps
            stage={live.stage}
            stageAt={live.stageAt}
            includeUnderstanding={live.includeUnderstanding}
            ai={live.ai?.ready ?? true}
          />
        )}

        {live?.error && !live.plan && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>That didn&apos;t work</AlertTitle>
            <AlertDescription>
              {live.error}
              <Button size="sm" variant="outline" className="mt-2 w-fit" onClick={() => onPlan()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!plan && !live && <HowItWorks />}

        {!plan && running && (
          <div className="grid gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        )}

        {plan && view && (
          <>
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-sindoor uppercase">
                  {day?.label} · {day?.weekday} {day ? Number(day.date.slice(8)) : ""} Oct
                </p>
                <h2 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-3xl">
                  From {plan.start.name}, {formatClock(parseClock(plan.intent.startTime))}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {view.intentSource === "gemma" && view.stats.intent
                    ? `Understood by ${prettyModel(view.stats.intent.model)} in ${(view.stats.intent.ms / 1000).toFixed(1)} s`
                    : view.intentSource === "rules"
                      ? "Understood by the rule-based parser"
                      : "Your own settings"}
                  {view.solveMs !== null && ` · route solved in ${Math.max(1, view.solveMs)} ms`}
                  {view.mode === "browser" && " · ran in your browser"}
                </p>
              </div>
              <Button
                size="lg"
                className="px-4"
                disabled={!plan.stops.length || running}
                nativeButton={false}
                render={<Link href="/walk" />}
              >
                <Footprints /> Start walking <ArrowRight />
              </Button>
            </header>

            <PlanSummary plan={plan} />

            <div className="relative h-[320px] overflow-hidden rounded-xl border sm:h-[420px]">
              <RouteMap
                start={plan.start}
                stops={plan.stops.map((s) => ({
                  id: s.pandal.id,
                  lat: s.pandal.lat,
                  lng: s.pandal.lng,
                  label: String(s.order),
                  name: s.pandal.name,
                  state: "todo",
                  approxRadius: s.pandal.coord === "approx" ? s.pandal.radiusM : undefined,
                }))}
                fitKey={plan.id}
              />
            </div>

            <NarrationCard
              text={view.narration}
              source={view.narrationSource}
              model={view.model}
              streaming={running && live?.stage === "writing"}
              stats={view.stats.narration}
              stale={view.stale}
              busy={running}
              onRewrite={onRewrite}
              lang={prefs.lang}
            />

            {(plan.warnings.length > 0 || plan.skipped.length > 0 || view.notices.length > 0 || dropped.length > 0) && (
              <Alert>
                <TriangleAlert />
                <AlertTitle>Worth knowing</AlertTitle>
                <AlertDescription>
                  <ul className="grid gap-1">
                    {plan.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                    {plan.skipped.map((s) => (
                      <li key={s.id}>
                        Couldn&apos;t fit <strong>{s.name}</strong>: {s.reason}.
                      </li>
                    ))}
                    {dropped.map((n) => (
                      <li key={n}>
                        The model mentioned “{n}”, which isn&apos;t in the curated list, so it was left out rather than guessed.
                      </li>
                    ))}
                    {view.notices.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl font-semibold">The route</CardTitle>
                <CardDescription>
                  Arrival times include walking, queueing and a few minutes in front of each idol. Queue estimates
                  come from a heuristic crowd clock, not live data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plan.stops.length ? (
                  <StopList plan={plan} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nothing fits that window. Give yourself more time or start closer to the pandals you want.
                  </p>
                )}
              </CardContent>
            </Card>

            {view.raw !== null && view.raw !== undefined && (
              <details className="group rounded-xl border bg-card px-4 py-3 text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground select-none group-open:text-foreground">
                  What the model actually returned
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
                  {JSON.stringify(view.raw, null, 2)}
                </pre>
                <p className="mt-2 text-xs text-pretty text-muted-foreground">
                  Ollama constrains Gemma&apos;s output to a JSON schema. The app then checks every field against
                  the dataset before the solver sees it, so a pandal the model made up can&apos;t end up on your
                  route.
                </p>
              </details>
            )}

            {plan.stops.length > 0 && (
              <div className="sticky bottom-3 z-30 lg:hidden">
                <Button
                  size="lg"
                  className="h-12 w-full text-base shadow-lg"
                  disabled={running}
                  nativeButton={false}
                  render={<Link href="/walk" />}
                >
                  <Footprints /> Start walking <ArrowRight />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AskDhaki open={dhakiOpen} onOpenChange={setDhakiOpen} day={plan?.intent.day ?? saved?.plan.intent.day} />
    </section>
  );
}
