"use client";

import { localIsoDate, useNow } from "@/lib/client/clock";
import { daysUntil, MAHALAYA, PUJA_DAY_BY_ID, PUJA_DAYS } from "@/lib/data/calendar";
import { cn } from "@/lib/utils";

const SHASHTHI = PUJA_DAY_BY_ID.get("shashthi")!.date;
const DASHAMI = PUJA_DAY_BY_ID.get("dashami")!.date;

function label(today: string): { text: string; bn?: string } {
  const day = PUJA_DAYS.find((d) => d.id !== "pre" && d.date === today);
  if (day) return { text: `Today is ${day.label}`, bn: day.bn };
  if (today > DASHAMI) return { text: "See you next year", bn: "আসছে বছর আবার হবে" };
  const n = daysUntil(today, SHASHTHI);
  if (today === MAHALAYA) return { text: `Mahalaya today · Shashthi in ${n} days`, bn: "মহালয়া" };
  if (today > MAHALAYA) return { text: n === 1 ? "Devi Paksha · Shashthi is tomorrow" : `Devi Paksha · Shashthi in ${n} days` };
  return { text: `Shashthi in ${n} days` };
}

export function Countdown({ className }: { className?: string }) {
  const now = useNow();
  if (!now) return <span className={cn("inline-block h-6 w-44 animate-pulse rounded-full bg-muted", className)} />;
  const l = label(localIsoDate(now));
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 rounded-full bg-sindoor/10 px-2.5 text-xs font-medium text-sindoor",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-sindoor" aria-hidden />
      {l.text}
      {l.bn && <span className="font-bn">{l.bn}</span>}
    </span>
  );
}
