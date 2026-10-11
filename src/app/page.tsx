import { Cpu, CloudOff, WifiOff } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { Planner } from "@/components/planner/planner";

export default function Home() {
  return (
    <>
      <section className="laal-paar paper border-b">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-9 sm:pt-14 sm:pb-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-full border bg-card px-2.5 text-xs font-medium">
              Durga Puja 2026 · Kolkata
            </span>
            <Countdown />
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
            Plan in thirty seconds. <span className="text-sindoor italic">Walk all night.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-pretty text-foreground/75">
            Tell a local AI how you want to do <span className="font-bn text-foreground">ঠাকুর দেখা</span> this year. It
            plans a crowd-aware walk between pandals, then gets out of your way. The phone goes in your pocket, a dhak
            drum tells you when you&apos;ve arrived, and each pandal&apos;s story unlocks only when you&apos;re standing
            in front of it.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/80">
            <li className="inline-flex items-center gap-2">
              <Cpu className="size-4 text-sindoor" aria-hidden /> Gemma 4 runs on your own machine
            </li>
            <li className="inline-flex items-center gap-2">
              <CloudOff className="size-4 text-sindoor" aria-hidden /> No API keys, nothing sent to the cloud
            </li>
            <li className="inline-flex items-center gap-2">
              <WifiOff className="size-4 text-sindoor" aria-hidden /> Walks work when the network doesn&apos;t
            </li>
          </ul>
        </div>
      </section>
      <Planner />
    </>
  );
}
