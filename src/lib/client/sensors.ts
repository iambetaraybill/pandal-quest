"use client";

import { useEffect, useState } from "react";

type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS only grants compass access from inside a tap handler. */
export async function requestCompass(): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
  const Ctor = window.DeviceOrientationEvent as OrientationCtor;
  if (typeof Ctor.requestPermission === "function") {
    try {
      return (await Ctor.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

/** Compass heading in degrees clockwise from north, or null when the device has no compass. */
export function useHeading(enabled: boolean): number | null {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let last = -999;
    const update = (h: number) => {
      const diff = Math.abs(((h - last + 540) % 360) - 180);
      if (diff >= 3) {
        last = h;
        setHeading(Math.round(h));
      }
    };
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) update((360 - e.alpha) % 360);
    };
    const onRelative = (e: DeviceOrientationEvent) => {
      const h = (e as OrientationWithCompass).webkitCompassHeading;
      if (typeof h === "number") update(h);
    };
    const absolute = "ondeviceorientationabsolute" in window;
    if (absolute) window.addEventListener("deviceorientationabsolute", onAbsolute);
    else window.addEventListener("deviceorientation", onRelative);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onAbsolute);
      window.removeEventListener("deviceorientation", onRelative);
    };
  }, [enabled]);

  return enabled ? heading : null;
}

/** Keeps the screen (and therefore GPS) awake while pocket mode is on. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Denied (battery saver) or unsupported: the walk still works, the screen may just sleep.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}
