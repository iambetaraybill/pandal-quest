import { formatDistance } from "@/lib/engine/geo";
import { formatClock, formatDuration, parseClock } from "@/lib/engine/time";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("bg-card px-4 py-3", accent && "bg-grass/8")}>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 font-display text-2xl leading-tight font-semibold tabular", accent && "text-[color-mix(in_oklch,var(--grass),black_25%)]")}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function PlanSummary({ plan }: { plan: Plan }) {
  const { totals } = plan;
  const saved = totals.peakQueueMin - totals.queueMin;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
      <Stat
        label="Pandals"
        value={String(plan.stops.length)}
        sub={`${formatClock(parseClock(plan.intent.startTime))} to ${formatClock(totals.endMin)}`}
      />
      <Stat label="On foot" value={`${(totals.walkMeters / 1000).toFixed(1)} km`} sub={`about ${formatDuration(totals.walkMin)} of walking`} />
      <Stat label="In queues" value={`~${formatDuration(totals.queueMin)}`} sub={`~${formatDuration(totals.peakQueueMin)} if you went at 9 pm`} />
      <Stat
        label="Queue dodged"
        value={saved > 0 ? formatDuration(saved) : "0 min"}
        sub={plan.endMetro ? `ends ${formatDistance(plan.endMetro.meters)} from a station` : "versus the 9 pm rush"}
        accent={saved > 0}
      />
    </div>
  );
}
