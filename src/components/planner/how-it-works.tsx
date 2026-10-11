import { Footprints, MessageSquareText, Receipt, Route } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Say it like you'd tell a friend",
    body: "“Saptami with my parents from Shyambazar, nothing with a long queue.” Gemma 4 turns that into a plan request on your own machine.",
  },
  {
    icon: Route,
    title: "A solver dodges the crowds",
    body: "Every pandal has a crowd clock. The planner orders your stops so the big ones come before the 9 pm crush and the walks stay short.",
  },
  {
    icon: Footprints,
    title: "Phone in pocket, eyes on the pandal",
    body: "Pocket mode keeps GPS alive on a black screen. A dhak drum plays when you arrive, and that pandal's story card unlocks.",
  },
  {
    icon: Receipt,
    title: "Your Touch Grass receipt",
    body: "At the end you get a receipt: pandals seen, kilometres walked, and how few minutes you actually spent looking at your phone.",
  },
];

export function HowItWorks() {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-5 sm:p-7">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">How it works</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-balance">The screen is the shortest part of the night.</h2>
      <ol className="mt-5 grid gap-5 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <s.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">
                <span className="mr-1.5 text-sindoor tabular">{i + 1}.</span>
                {s.title}
              </p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
