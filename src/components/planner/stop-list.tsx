import { Footprints, MapPinned, TrainFront } from "lucide-react";
import { CrowdSpark } from "@/components/planner/crowd-spark";
import { CROWD_TONE, KIND_LABEL } from "@/components/planner/labels";
import { CROWD_LABEL } from "@/lib/engine/crowd";
import { formatDistance } from "@/lib/engine/geo";
import { formatClock, parseClock } from "@/lib/engine/time";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StopList({ plan }: { plan: Plan }) {
  return (
    <ol className="relative">
      <li className="grid grid-cols-[2rem_1fr] gap-3">
        <div className="flex flex-col items-center">
          <span className="grid size-8 place-items-center rounded-full bg-grass text-xs font-bold text-white">S</span>
          <span className="w-px flex-1 bg-border" />
        </div>
        <div className="pb-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{plan.start.name}</p>
            <span className="text-sm text-muted-foreground tabular">{formatClock(parseClock(plan.intent.startTime))}</span>
          </div>
          <p className="text-sm text-muted-foreground">Start here</p>
        </div>
      </li>
      {plan.stops.map((s, i) => {
        const p = s.pandal;
        const last = i === plan.stops.length - 1;
        return (
          <li key={p.id} className="grid grid-cols-[2rem_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="grid size-8 place-items-center rounded-full bg-sindoor text-sm font-bold text-primary-foreground">
                {s.order}
              </span>
              {!last && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("min-w-0", !last && "pb-7")}>
              <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Footprints className="size-3.5" aria-hidden />
                {formatDistance(s.legMeters)} · {Math.round(s.legWalkMin)} min walk
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg leading-tight font-semibold">{p.name}</h3>
                <span className="shrink-0 text-sm font-semibold tabular">{formatClock(s.arriveMin)}</span>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <span className="font-bn">{p.bn}</span>
                <span aria-hidden>·</span>
                <span>{p.neighbourhood}</span>
                <span aria-hidden>·</span>
                <span>{KIND_LABEL[p.kind]}</span>
                {p.coord === "approx" && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <MapPinned className="size-3" aria-hidden /> approximate pin
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-pretty text-foreground/85">{p.knownFor}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", CROWD_TONE[s.crowd])}>
                  {CROWD_LABEL[s.crowd]}
                  {p.kind !== "landmark" && ` · ~${s.queueMin} min queue`}
                </span>
                {s.reasons
                  .filter((r) => !r.startsWith("~"))
                  .map((r) => (
                    <span key={r} className="inline-flex h-6 items-center rounded-full border px-2.5 text-xs text-foreground/80">
                      {r}
                    </span>
                  ))}
              </div>
              {p.kind !== "landmark" && (
                <>
                  {s.peakQueueMin - s.queueMin >= 10 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      At 9 pm this queue would be about <strong className="text-foreground">{s.peakQueueMin} min</strong>.
                    </p>
                  )}
                  <CrowdSpark pandal={p} day={plan.intent.day} arriveMin={s.arriveMin} />
                </>
              )}
            </div>
          </li>
        );
      })}
      {plan.endMetro && plan.stops.length > 0 && (
        <li className="mt-5 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <TrainFront className="size-4 text-muted-foreground" aria-hidden />
          Finish around <strong className="tabular">{formatClock(plan.totals.endMin)}</strong>,{" "}
          {formatDistance(plan.endMetro.meters)} from {plan.endMetro.name}.
        </li>
      )}
    </ol>
  );
}
