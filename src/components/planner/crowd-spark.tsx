import { crowdClock } from "@/lib/engine/crowd";
import { formatClock } from "@/lib/engine/time";
import type { Pandal, PujaDayId } from "@/lib/types";

const FROM = 12 * 60;
const TO = 28 * 60;
const W = 200;
const H = 40;

/** The Crowd Clock for one pandal: estimated queue from noon to 4 am, with your arrival marked. */
export function CrowdSpark({ pandal, day, arriveMin }: { pandal: Pandal; day: PujaDayId; arriveMin: number }) {
  const pts = crowdClock(pandal, day);
  const max = Math.max(30, ...pts.map((p) => p.queue));
  const x = (min: number) => ((Math.min(TO, Math.max(FROM, min)) - FROM) / (TO - FROM)) * W;
  const y = (q: number) => H - 3 - (q / max) * (H - 8);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.min).toFixed(1)},${y(p.queue).toFixed(1)}`).join("");
  const area = `${line}L${W},${H}L0,${H}Z`;
  const arrive = arriveMin < FROM ? arriveMin + 1440 : arriveMin;
  const ax = x(arrive);
  const idx = Math.min(pts.length - 1, Math.max(0, Math.round((arrive - FROM) / 60)));
  const peak = pts.reduce((a, b) => (b.queue > a.queue ? b : a));

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-10 w-full overflow-visible"
        role="img"
        aria-label={`Estimated queue through the night. Peak about ${peak.queue} minutes around ${formatClock(peak.min)}; you arrive at ${formatClock(arriveMin)}.`}
      >
        <path d={area} fill="color-mix(in oklch, var(--sindoor), transparent 88%)" />
        <path d={line} fill="none" stroke="var(--sindoor)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <line x1={ax} x2={ax} y1={0} y2={H} stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        <circle cx={ax} cy={y(pts[idx].queue)} r="3" fill="var(--ink)" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[10px] tracking-wide text-muted-foreground uppercase tabular">
        <span>Noon</span>
        <span>6 pm</span>
        <span>Midnight</span>
        <span>4 am</span>
      </figcaption>
    </figure>
  );
}
