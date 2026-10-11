"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatElapsed } from "@/lib/client/clock";
import { prettyModel } from "@/lib/format";
import { eyesOffMs } from "@/lib/client/walk-logic";
import type { WalkRecord } from "@/lib/client/state";
import { formatDistance } from "@/lib/engine/geo";
import { plural } from "@/lib/format";

function shareText(r: WalkRecord): string {
  const off = formatElapsed(eyesOffMs(r.time));
  const on = formatElapsed(r.time.screenOnMs);
  return [
    `Touch Grass receipt — Pandal Quest`,
    `${plural(r.stamps.length, "pandal")} seen, ${formatDistance(r.meters)} walked.`,
    `Eyes on the city: ${off}. Eyes on the phone: ${on}.`,
    r.queueSavedMin > 0 ? `About ${r.queueSavedMin} minutes of queue dodged versus 9 pm.` : "",
    r.model ? `Planned with ${prettyModel(r.model)} on my own machine.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function Receipt({ record, onAgain }: { record: WalkRecord; onAgain: () => void }) {
  const text = shareText(record);
  const off = eyesOffMs(record.time);
  const on = record.time.screenOnMs;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Pandal Quest", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied.");
    } catch {
      // User dismissed the share sheet.
    }
  }

  return (
    <article className="laal-paar mx-auto grid w-full max-w-lg gap-5 rounded-2xl border bg-card p-6 pt-8">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-sindoor uppercase">Touch Grass receipt</p>
        <h2 className="mt-1 font-display text-3xl font-semibold text-balance">You looked up.</h2>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {record.demo ? "A demo walk, but the receipt is real math: screen-on time versus pocket time." : "A walk that happened on the street, not on the timeline."}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
        <div className="bg-card p-3">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Pandals</dt>
          <dd className="font-display text-2xl font-semibold tabular">{record.stamps.length}</dd>
        </div>
        <div className="bg-card p-3">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Walked</dt>
          <dd className="font-display text-2xl font-semibold tabular">{formatDistance(record.meters)}</dd>
        </div>
        <div className="bg-grass/10 p-3">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Eyes on the city</dt>
          <dd className="font-display text-2xl font-semibold tabular">{formatElapsed(off)}</dd>
        </div>
        <div className="bg-card p-3">
          <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Eyes on the phone</dt>
          <dd className="font-display text-2xl font-semibold tabular">{formatElapsed(on)}</dd>
        </div>
      </dl>
      {record.queueSavedMin > 0 && (
        <p className="text-sm text-muted-foreground">
          Versus going at 9 pm, the planner saved you about <strong className="text-foreground">{record.queueSavedMin} minutes</strong> of
          queueing.
        </p>
      )}
      {record.model && (
        <p className="text-xs text-muted-foreground">Planned by {prettyModel(record.model)} · 0 bytes to the cloud.</p>
      )}
      <pre className="rounded-lg bg-muted p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void share()}>
          <Share2 /> Share the receipt
        </Button>
        <Button variant="outline" onClick={onAgain}>
          Plan another walk
        </Button>
      </div>
    </article>
  );
}
