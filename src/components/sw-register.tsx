"use client";

import { useEffect } from "react";

/**
 * Production builds register a service worker so the app shell, story cards and viewed map
 * tiles survive a dead network. Dev builds unregister it so hot reload is never served stale.
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
