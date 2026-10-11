"use client";

import { useSyncExternalStore } from "react";

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  fallback: T;
}

/**
 * A tiny localStorage-backed external store. Reads are memoised on the raw string so
 * `useSyncExternalStore` sees a stable snapshot, and the server snapshot is always `fallback`
 * so hydration never mismatches.
 */
export function createStore<T>(key: string, fallback: T): Store<T> {
  const listeners = new Set<() => void>();
  let raw: string | null = null;
  let value: T = fallback;
  let memoryOnly: { value: T } | null = null;

  function get(): T {
    if (typeof window === "undefined") return fallback;
    if (memoryOnly) return memoryOnly.value;
    let next: string | null;
    try {
      next = window.localStorage.getItem(key);
    } catch {
      return value;
    }
    if (next !== raw) {
      raw = next;
      try {
        value = next === null ? fallback : (JSON.parse(next) as T);
      } catch {
        value = fallback;
      }
    }
    return value;
  }

  function set(next: T | ((prev: T) => T)) {
    const v = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    try {
      if (v === null || v === undefined) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(v));
      memoryOnly = null;
    } catch {
      // Private mode or a full quota: keep the walk going in memory.
      memoryOnly = { value: v };
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe, fallback };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}

const subscribeNoop = () => () => {};
/** False during SSR and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
