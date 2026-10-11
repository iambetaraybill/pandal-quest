"use client";

import Link from "next/link";
import { StampMark } from "@/components/walk/stamp-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatElapsed } from "@/lib/client/clock";
import { historyStore, walkStore } from "@/lib/client/state";
import { useHydrated, useStore } from "@/lib/client/store";
import { eyesOffMs } from "@/lib/client/walk-logic";
import { PUJA_DAY_BY_ID } from "@/lib/data/calendar";
import { formatDistance } from "@/lib/engine/geo";
import { prettyModel } from "@/lib/format";
import { plural } from "@/lib/format";

export function PassportApp() {
  const hydrated = useHydrated();
  const history = useStore(historyStore);
  const walking = useStore(walkStore);
  const stamps = [...(walking?.stamps ?? []), ...history.flatMap((r) => r.stamps)];
  const unique = [...new Map(stamps.map((s) => [s.id, s])).values()];
  const km = history.reduce((a, r) => a + r.meters, 0) + (walking?.meters ?? 0);
  const off = history.reduce((a, r) => a + eyesOffMs(r.time), 0) + (walking ? eyesOffMs(walking.time) : 0);
  const on = history.reduce((a, r) => a + r.time.screenOnMs, 0) + (walking?.time.screenOnMs ?? 0);

  if (!hydrated) return <div className="mx-auto h-80 max-w-4xl animate-pulse px-4 py-10" />;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-sindoor uppercase">Passport</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Stamps you walked to.</h1>
        <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
          A card unlocks only when you arrive. No check-in button from the sofa — unless you admit it&apos;s a demo.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Pandals", String(unique.length)],
          ["Walked", formatDistance(km)],
          ["Eyes on the city", off ? formatElapsed(off) : "—"],
          ["Eyes on the phone", on ? formatElapsed(on) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-card p-4">
            <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{k}</dt>
            <dd className="font-display text-2xl font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {unique.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl font-semibold">Still blank</CardTitle>
            <CardDescription>
              Plan a walk, then either go outside or run the demo. Each arrival leaves a darshan stamp here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/" />}>
              Plan a walk
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {unique.map((s) => (
            <li key={s.id} className="rounded-xl border bg-card p-3">
              <StampMark
                name={s.name}
                bn={s.bn}
                date={new Date(s.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              />
              {s.trivia && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Trivia: {s.trivia === "right" ? "right" : "missed"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl font-semibold">Walks</h2>
          <ol className="grid gap-2">
            {history.map((r) => {
              const day = PUJA_DAY_BY_ID.get(r.day);
              return (
                <li key={r.id} className="rounded-xl border bg-card px-4 py-3">
                  <p className="font-medium">
                    {day?.label ?? r.day} from {r.startName}
                    {r.demo && <span className="ml-2 text-xs font-normal text-muted-foreground">demo</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plural(r.stamps.length, "stamp")} · {formatDistance(r.meters)} · city {formatElapsed(eyesOffMs(r.time))} ·
                    phone {formatElapsed(r.time.screenOnMs)}
                    {r.model ? ` · ${prettyModel(r.model)}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
