"use client";

import { Footprints, Info, Map as MapIcon, Stamp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiPill } from "@/components/ai-status";
import { Logo } from "@/components/logo";
import { walkStore } from "@/lib/client/state";
import { useStore } from "@/lib/client/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Plan", icon: MapIcon },
  { href: "/walk", label: "Walk", icon: Footprints },
  { href: "/passport", label: "Passport", icon: Stamp },
  { href: "/about", label: "Why open", icon: Info },
] as const;

function NavLinks({ compact }: { compact?: boolean }) {
  const pathname = usePathname();
  const walking = useStore(walkStore) !== null;
  return NAV.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          active && "text-foreground",
          compact && "flex-1 justify-center px-1 text-[13px]",
        )}
      >
        <Icon className="size-4" aria-hidden />
        {label}
        {href === "/walk" && walking && (
          <span className="size-1.5 rounded-full bg-sindoor" aria-label="walk in progress" />
        )}
        {active && <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-sindoor" aria-hidden />}
      </Link>
    );
  });
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-7" />
          <span className="font-display text-lg leading-none font-semibold tracking-tight">Pandal Quest</span>
          <span className="hidden font-bn text-sm text-muted-foreground sm:inline">ঠাকুর দেখা</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLinks />
        </nav>
        <div className="ml-auto">
          <AiPill />
        </div>
      </div>
      <nav className="flex border-t px-1 py-1 md:hidden" aria-label="Main">
        <NavLinks compact />
      </nav>
    </header>
  );
}
