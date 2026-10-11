import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, EyeOff, Leaf, Scale, Wallet, WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Why open",
  description: "A local open-weight model, a deterministic planner, and a phone that knows when to shut up.",
};

const PILLARS = [
  {
    icon: Cpu,
    title: "The model lives on your laptop",
    body: "Gemma 4 runs through Ollama on whatever machine is serving the app. There is no cloud API key, no usage meter, and nothing you type is sent to a third party. Swap the model with an environment variable.",
  },
  {
    icon: Scale,
    title: "The model decides. Code computes.",
    body: "Gemma turns “Saptami with my parents, no long queues” into a typed request. A beam-search planner then does the maths that language models are bad at: walking times, the crowd clock, what still fits in three hours. Gemma writes the guide from those numbers. It cannot invent a pandal — every name is checked against the dataset.",
  },
  {
    icon: WifiOff,
    title: "Puja nights kill the network",
    body: "College Square at 10 pm is a dead zone. Story cards are generated ahead of time and shipped in the app. The planner can run in the browser. A service worker keeps the shell and the map tiles you already saw. The walk does not need a signal.",
  },
  {
    icon: EyeOff,
    title: "The screen is supposed to go dark",
    body: "Pocket mode is a black screen that keeps GPS awake. Arrival is a dhak drum, not a banner. The Touch Grass receipt at the end is the only scoreboard that matters: minutes looking at Durga versus minutes looking at glass.",
  },
  {
    icon: Wallet,
    title: "$0 to run",
    body: "Ollama is free. Gemma 4 E2B is free. The street map is free. The whole stack is a laptop and a phone. That is the point of an open-weight challenge.",
  },
  {
    icon: Leaf,
    title: "Kash phool, then the walk",
    body: "Kash grass blooming on the Maidan is how Kolkata knows Pujo is coming. Satyajit Ray put that field in Pather Panchali. UNESCO listed this puja as intangible heritage in 2021. The app is a short screen in front of a long night outside.",
  },
];

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-sindoor uppercase">Why open</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-balance sm:text-5xl">
        An open model, a closed pocket.
      </h1>
      <p className="mt-4 text-lg text-pretty text-foreground/80">
        Pandal Quest is a Durga Puja companion for Kolkata. You talk to a local copy of Gemma 4 the way you&apos;d talk
        to a friend who knows the para. It plans a walking route that treats queues as a first-class cost. Then it
        tries to disappear.
      </p>

      <ol className="mt-10 grid gap-6">
        {PILLARS.map((p) => (
          <li key={p.title} className="flex gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <p.icon className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 text-pretty text-muted-foreground">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-12 grid gap-3">
        <h2 className="font-display text-2xl font-semibold">What the crowd clock is — and isn&apos;t</h2>
        <p className="text-pretty text-muted-foreground">
          Queue minutes = the pandal&apos;s popularity tier × a kind factor (family pujas are quieter; landmarks have no
          queue) × an hour-of-night curve × the day of puja. Ashtami morning anjali is a special case. This is a
          transparent heuristic, not live crowd data. The UI says so next to every number. The planner uses it so a
          9 pm visit to Sreebhumi costs more than a 5 pm visit, which is the thing every Kolkatan already knows.
        </p>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-2xl font-semibold">The 2026 calendar we planned against</h2>
        <p className="text-pretty text-muted-foreground">
          Mahalaya was Saturday 10 October. Shashthi Friday 16, then a Saturday that some panjikas call Shashthi and
          some call Saptami, Saptami Sunday 18, Ashtami Monday 19 (Sandhi Puja roughly 10:29–11:17 am), Navami Tuesday
          20, Dashami Wednesday 21. We kept Saturday 17 as its own day so the crowd model doesn&apos;t have to pick a
          fight with the priests.
        </p>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-2xl font-semibold">Credits</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Stop coordinates from{" "}
            <a className="underline underline-offset-3 hover:text-foreground" href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </a>{" "}
            contributors (ODbL). Pins marked “approximate” are estimated, with a wider arrival radius.
          </li>
          <li>Maps: Leaflet and CARTO&apos;s Voyager tiles.</li>
          <li>
            <a className="underline underline-offset-3 hover:text-foreground" href="https://ai.google.dev/gemma">
              Gemma 4
            </a>{" "}
            by Google DeepMind, served by{" "}
            <a className="underline underline-offset-3 hover:text-foreground" href="https://ollama.com">
              Ollama
            </a>
            .
          </li>
          <li>Next.js, React, Tailwind, shadcn/ui.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Built for the DEV.to Hacktoberfest Open-Source AI Challenge, week 1 — “Touch Grass.”{" "}
        <Link href="/" className="underline underline-offset-3 hover:text-foreground">
          Go plan a walk
        </Link>
        .
      </p>
    </article>
  );
}
