"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { formatDistance } from "@/lib/engine/geo";

const HOLD_MS = 700;

export function PocketScreen({
  nextName,
  distanceM,
  onExit,
}: {
  nextName: string;
  distanceM: number | null;
  onExit: () => void;
}) {
  const [held, setHeld] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function startHold() {
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / HOLD_MS);
      setHeld(p);
      if (p >= 1) {
        stopHold();
        onExit();
      }
    }, 40);
  }

  function stopHold() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHeld(0);
  }

  useEffect(() => () => stopHold(), []);

  return (
     <div className="fixed inset-0 z-[5000] flex flex-col items-center justify-between bg-ink px-6 py-10 text-kash">
      <p className="text-[11px] tracking-[0.2em] text-kash/50 uppercase">Pocket mode · screen stays awake</p>
      <div className="grid justify-items-center gap-4 text-center">
        <Logo className="size-12 opacity-90" />
        <p className="font-display text-2xl font-semibold text-balance">{nextName}</p>
        <p className="font-display text-5xl font-semibold tabular">
          {distanceM === null ? "…" : formatDistance(distanceM)}
        </p>
        <p className="max-w-xs text-sm text-kash/60">
          Phone in your pocket. The dhak will play when you arrive. Hold the button below if you need the map.
        </p>
      </div>
      <button
        type="button"
        className="relative h-12 w-full max-w-xs overflow-hidden rounded-full border border-kash/30 text-sm font-medium"
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
        onPointerLeave={stopHold}
      >
        <span
          className="absolute inset-y-0 left-0 bg-sindoor/80"
          style={{ width: `${held * 100}%` }}
          aria-hidden
        />
        <span className="relative">Hold to look</span>
      </button>
    </div>
  );
}
