"use client";

import { Compass as CompassIcon, Footprints, LocateFixed, SkipForward, Smartphone } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrivalCard } from "@/components/walk/arrival-card";
import { PocketScreen } from "@/components/walk/pocket-screen";
import { Receipt } from "@/components/walk/receipt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { arrivalCue, playShankh, unlockAudio } from "@/lib/client/audio";
import { getFix, setFix, useFix } from "@/lib/client/position";
import { requestCompass, useHeading, useWakeLock } from "@/lib/client/sensors";
import { historyStore, planStore, prefsStore, walkStore, type WalkRecord } from "@/lib/client/state";
import { useHydrated, useStore } from "@/lib/client/store";
import {
  addTravel,
  advance,
  collectStamp,
  currentStop,
  finishWalk,
  isFinished,
  isInside,
  markTrivia,
  skipCurrent,
  startWalk,
  tickTime,
} from "@/lib/client/walk-logic";
import { bearing, compassWord, formatDistance, haversine, stepTowards, walkMinutes } from "@/lib/engine/geo";
import { formatClock } from "@/lib/engine/time";
import type { Plan } from "@/lib/types";

const RouteMap = dynamic(() => import("@/components/route-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

const DEMO_STEP_M = 14;

function Compass({ heading, bear }: { heading: number | null; bear: number }) {
  const rotation = heading === null ? bear : (bear - heading + 360) % 360;
  return (
    <div className="relative grid size-36 place-items-center">
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-border" />
      <span className="absolute top-1 text-[10px] font-semibold tracking-widest text-muted-foreground">N</span>
      <div className="transition-transform duration-200 ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
        <svg viewBox="0 0 80 80" className="size-24" aria-hidden>
          <path d="M40 8 L48 48 L40 42 L32 48 Z" fill="var(--sindoor)" />
        </svg>
      </div>
    </div>
  );
}

function PrefRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <Label htmlFor={id} className="grid cursor-pointer gap-0.5">
        <span className="font-medium">{label}</span>
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function WalkApp() {
  const hydrated = useHydrated();
  const saved = useStore(planStore);
  const walk = useStore(walkStore);
  const prefs = useStore(prefsStore);
  const fix = useFix();
  const [receipt, setReceipt] = useState<WalkRecord | null>(null);
  const cued = useRef<string | null>(null);
  const plan = saved?.plan ?? null;

  const stop = plan && walk ? currentStop(plan, walk) : null;
  const heading = useHeading(Boolean(walk) && !walk?.demo && !walk?.pocket);
  const router = useRouter();
  useWakeLock(Boolean(walk?.pocket));

  useEffect(() => {
    if (!walk || !plan || walk.demo) return;
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: pos.timestamp,
        };
        const prev = getFix();
        setFix(next);
        walkStore.set((w) => (w ? addTravel(w, prev, next) : w));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // Restart only when a new walk starts or demo/live mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk?.planId, walk?.demo]);

  useEffect(() => {
    if (!walk?.demo || !plan) return;
    if (!getFix()) setFix({ ...plan.start, accuracy: 8, at: Date.now() });
    const id = setInterval(() => {
      const w = walkStore.get();
      if (!w?.demo) return;
      const s = currentStop(plan, w);
      if (!s || w.arrivedAt) return;
      const prev = getFix() ?? { ...plan.start, accuracy: 8, at: Date.now() };
      const next = { ...stepTowards(prev, s.pandal, DEMO_STEP_M), accuracy: 8, at: Date.now() };
      setFix(next);
      walkStore.set(addTravel(w, prev, next));
    }, 280);
    return () => clearInterval(id);
  }, [walk?.demo, walk?.stopIndex, walk?.arrivedAt, plan]);

  useEffect(() => {
    if (!walk || !plan || !fix || walk.arrivedAt || !stop) return;
    if (!isInside(fix, stop.pandal)) return;
    if (cued.current === stop.pandal.id) return;
    cued.current = stop.pandal.id;
    walkStore.set(collectStamp({ ...walk, pocket: false }, stop, Date.now()));
    arrivalCue({
      dhak: prefs.dhak,
      voice: prefs.voice,
      text: `You've arrived at ${stop.pandal.name}. Look up.`,
      lang: prefs.lang,
    });
  }, [fix, walk, plan, stop, prefs.dhak, prefs.voice, prefs.lang]);

  useEffect(() => {
    if (!walk) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const hidden = document.visibilityState === "hidden";
      walkStore.set((w) => (w ? tickTime(w, dt, w.pocket, hidden) : w));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk?.planId]);

  function closeOut(next: NonNullable<typeof walk>, thePlan: Plan) {
    const rec = finishWalk(thePlan, next, saved?.model ?? null, Date.now());
    historyStore.set((h) => [rec, ...h].slice(0, 24));
    walkStore.set(null);
    setReceipt(rec);
    playShankh();
  }

  function onContinue() {
    if (!walk || !plan) return;
    cued.current = null;
    const next = advance(walk);
    if (isFinished(plan, next)) closeOut(next, plan);
    else walkStore.set(next);
  }

  function onSkip() {
    if (!walk || !plan) return;
    cued.current = null;
    const next = skipCurrent(walk, plan);
    if (isFinished(plan, next)) closeOut(next, plan);
    else walkStore.set(next);
  }

  function onHere() {
    if (!walk || !plan || !stop) return;
    cued.current = stop.pandal.id;
    walkStore.set(collectStamp({ ...walk, pocket: false }, stop, Date.now()));
    arrivalCue({
      dhak: prefs.dhak,
      voice: prefs.voice,
      text: `You've arrived at ${stop.pandal.name}. Look up.`,
      lang: prefs.lang,
    });
  }

  async function begin(demo: boolean) {
    if (!plan) return;
    if (!plan.stops.length) {
      toast("This plan has no stops. Go back and give yourself more time.");
      return;
    }
    unlockAudio();
    await requestCompass();
    setFix(demo ? { ...plan.start, accuracy: 8, at: Date.now() } : getFix());
    if (!demo && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: pos.timestamp }),
        () => toast("Couldn't get a GPS fix yet. You can still tap I'm here at each stop."),
        { enableHighAccuracy: true, timeout: 12_000 },
      );
    }
    setReceipt(null);
    cued.current = null;
    walkStore.set(startWalk(plan, demo, Date.now()));
  }

  if (!hydrated) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Receipt record={receipt} onAgain={() => router.push("/")} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto grid max-w-lg gap-4 px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">No walk on the books</h1>
        <p className="text-pretty text-muted-foreground">
          Plan an evening first. The walk starts from that route — GPS, pocket mode, dhak and all.
        </p>
        <Button nativeButton={false} render={<Link href="/" />} className="mx-auto">
          Plan a walk
        </Button>
      </div>
    );
  }

  if (!walk) {
    return (
      <section className="mx-auto grid w-full max-w-lg gap-5 px-4 py-10">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-sindoor uppercase">Ready to walk</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-balance">{plan.stops.length} stops from {plan.start.name}</h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            First arrival around {plan.stops[0] ? formatClock(plan.stops[0].arriveMin) : "—"}. After you start, put the
            phone away. The dhak is the only notification that matters.
          </p>
        </header>
        <div className="grid gap-2">
          <PrefRow
            id="dhak"
            label="Dhak on arrival"
            hint="A synthesised drum, no audio file to download"
            checked={prefs.dhak}
            onChange={(dhak) => prefsStore.set({ ...prefs, dhak })}
          />
          <PrefRow
            id="voice"
            label="Spoken prompt"
            hint="“You've arrived at Bagbazar. Look up.”"
            checked={prefs.voice}
            onChange={(voice) => prefsStore.set({ ...prefs, voice })}
          />
          <PrefRow
            id="pocket"
            label="Offer pocket mode"
            hint="Black screen, GPS stays on, hold to peek"
            checked={prefs.autoPocket}
            onChange={(autoPocket) => prefsStore.set({ ...prefs, autoPocket })}
          />
        </div>
        <div className="grid gap-2">
          <Button size="lg" className="h-12 text-base" onClick={() => void begin(false)}>
            <LocateFixed /> Start walking
          </Button>
          <Button size="lg" variant="outline" className="h-11" onClick={() => void begin(true)}>
            <Footprints /> Demo walk (no GPS)
          </Button>
          <p className="text-center text-xs text-pretty text-muted-foreground">
            Demo mode walks the route on the map so you can hear the dhak and unlock stamps from a desk. Use Start
            walking when you&apos;re actually on the street.
          </p>
        </div>
      </section>
    );
  }

  const you = fix ?? (walk.demo ? plan.start : null);
  const distance = you && stop ? haversine(you, stop.pandal) : null;
  const bear = you && stop ? bearing(you, stop.pandal) : 0;
  const eta = distance !== null ? Math.round(walkMinutes(distance, 4.4)) : null;
  const arrived = Boolean(walk.arrivedAt && stop);
  const stamp = stop ? walk.stamps.find((s) => s.id === stop.pandal.id) : null;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {walk.pocket && stop && (
        <PocketScreen
          nextName={stop.pandal.name}
          distanceM={distance}
          onExit={() => walkStore.set({ ...walk, pocket: false })}
        />
      )}

      <div className="grid content-start gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular">
            {Math.min(walk.stopIndex + 1, plan.stops.length)} of {plan.stops.length}
            {walk.demo && " · demo"}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("End this walk? Stamps you've already collected stay in your passport.")) {
                closeOut(walk, plan);
              }
            }}
          >
            End walk
          </Button>
        </div>

        {arrived && stop && stamp ? (
          <Card className="laal-paar pt-7">
            <CardHeader>
              <CardTitle className="font-display text-xl font-semibold">You&apos;re here</CardTitle>
              <CardDescription>{stop.pandal.neighbourhood}</CardDescription>
            </CardHeader>
            <CardContent>
              <ArrivalCard
                pandal={stop.pandal}
                stamp={stamp}
                lang={prefs.lang}
                onTrivia={(result) => walkStore.set(markTrivia(walk, stop.pandal.id, result))}
                onContinue={onContinue}
              />
            </CardContent>
          </Card>
        ) : stop ? (
          <Card>
            <CardHeader>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-sindoor uppercase">Next</p>
              <CardTitle className="font-display text-2xl font-semibold text-balance">{stop.pandal.name}</CardTitle>
              <CardDescription>
                <span className="font-bn">{stop.pandal.bn}</span>
                <span aria-hidden> · </span>
                {stop.pandal.neighbourhood}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid justify-items-center gap-3">
              <Compass heading={heading} bear={bear} />
              <p className="font-display text-4xl font-semibold tabular">
                {distance === null ? "Finding you…" : formatDistance(distance)}
              </p>
              <p className="text-sm text-muted-foreground">
                {heading === null
                  ? `Head ${compassWord(bear)}`
                  : eta !== null
                    ? `About ${eta} min · ${compassWord(bear)}`
                    : compassWord(bear)}
                {"accuracy" in (you ?? {}) && (you as { accuracy: number }).accuracy > 80 && " · GPS is fuzzy"}
              </p>
              <p className="text-center text-sm text-pretty text-foreground/80">{stop.pandal.knownFor}</p>
            </CardContent>
          </Card>
        ) : null}

        {!arrived && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              disabled={!prefs.autoPocket || !stop}
              onClick={() => walkStore.set({ ...walk, pocket: true })}
            >
              <Smartphone /> Pocket
            </Button>
            <Button variant="outline" onClick={onHere} disabled={!stop}>
              <CompassIcon /> I&apos;m here
            </Button>
            <Button variant="outline" onClick={onSkip} disabled={!stop}>
              <SkipForward /> Skip
            </Button>
          </div>
        )}
      </div>

      <div className="relative h-[320px] overflow-hidden rounded-xl border sm:h-[480px] lg:h-[calc(100dvh-8rem)]">
        <RouteMap
          start={plan.start}
          you={you}
          focus={you}
          fitKey={`${plan.id}:${walk.stopIndex}`}
          stops={plan.stops.map((s, i) => ({
            id: s.pandal.id,
            lat: s.pandal.lat,
            lng: s.pandal.lng,
            label: String(s.order),
            name: s.pandal.name,
            state: walk.skipped.includes(s.pandal.id)
              ? "skipped"
              : i < walk.stopIndex || walk.stamps.some((st) => st.id === s.pandal.id)
                ? "done"
                : i === walk.stopIndex
                  ? "next"
                  : "todo",
            approxRadius: s.pandal.coord === "approx" ? s.pandal.radiusM : undefined,
          }))}
        />
        {walk.demo && (
          <p className="absolute bottom-2 left-2 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium shadow">
            Demo · the blue dot walks for you
          </p>
        )}
      </div>
    </div>
  );
}
