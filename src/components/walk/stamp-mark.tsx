import { cn } from "@/lib/utils";

export function StampMark({
  name,
  bn,
  date,
  animate,
  className,
}: {
  name: string;
  bn?: string;
  date?: string;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto grid aspect-square w-44 place-items-center text-sindoor",
        animate && "animate-stamp",
        className,
      )}
    >
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="80" cy="80" r="66" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
        <path d="M80 28c8 10 8 20 0 30-8-10-8-20 0-30z" fill="currentColor" />
      </svg>
      <div className="relative px-6 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">Darshan</p>
        <p className="font-display text-base leading-tight font-semibold text-balance">{name}</p>
        {bn && <p className="font-bn text-sm">{bn}</p>}
        {date && <p className="mt-1 text-[10px] tracking-wider uppercase tabular">{date}</p>}
      </div>
    </div>
  );
}
