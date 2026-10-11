"use client";

import { useSyncExternalStore } from "react";
import type { LatLng } from "@/lib/engine/geo";

export interface Fix extends LatLng {
  accuracy: number;
  at: number;
}

let fix: Fix | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setFix(next: Fix | null) {
  fix = next;
  emit();
}

export function getFix(): Fix | null {
  return fix;
}

export function useFix(): Fix | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => fix,
    () => null,
  );
}
