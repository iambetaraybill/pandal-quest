import { cn } from "@/lib/utils";

/** Trinayani: the goddess's third eye, painted on every Kolkata idol. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="var(--sindoor)" />
      <path
        d="M4.8 17.4c3.4-4.9 7.1-7.3 11.2-7.3s7.8 2.4 11.2 7.3c-3.4 4.4-7.1 6.6-11.2 6.6s-7.8-2.2-11.2-6.6z"
        fill="var(--kash)"
      />
      <circle cx="16" cy="17.1" r="4" fill="var(--ink)" />
      <circle cx="17.3" cy="15.8" r="1.1" fill="var(--kash)" />
      <path d="M16 3.6c1.5 1.7 1.5 3.6 0 5.3-1.5-1.7-1.5-3.6 0-5.3z" fill="var(--marigold)" />
    </svg>
  );
}
