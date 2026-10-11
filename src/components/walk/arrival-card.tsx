"use client";

import { useState } from "react";
import { StampMark } from "@/components/walk/stamp-mark";
import { Button } from "@/components/ui/button";
import { hasGemmaStory, storyFor } from "@/lib/client/stories";
import type { Stamp } from "@/lib/client/state";
import type { Pandal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ArrivalCard({
  pandal,
  stamp,
  lang,
  onTrivia,
  onContinue,
}: {
  pandal: Pandal;
  stamp: Stamp;
  lang: "en" | "bn";
  onTrivia: (result: "right" | "wrong") => void;
  onContinue: () => void;
}) {
  const story = storyFor(pandal.id, lang);
  const [picked, setPicked] = useState<number | null>(stamp.trivia === null ? null : stamp.trivia === "right" ? story?.trivia.answer ?? null : -1);
  const answered = picked !== null && story !== null;
  const correct = answered && picked === story.trivia.answer;

  return (
    <div className="grid gap-5">
      <StampMark
        name={pandal.name}
        bn={pandal.bn}
        date={new Date(stamp.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        animate
      />
      {story && (
        <>
          <p
            lang={story.lang === "bn" ? "bn" : undefined}
            className={cn("text-[15px] leading-relaxed text-pretty", story.lang === "bn" && "font-bn")}
          >
            {story.story}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {hasGemmaStory(pandal.id, story.lang)
              ? `Written by the local model for ${pandal.name}.`
              : "A curated card — the local model hadn't written this one yet."}
          </p>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Look for, with your own eyes</p>
            <ul className="mt-2 grid gap-2">
              {story.lookFor.map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <span className="mt-0.5 text-sindoor" aria-hidden>
                    ▢
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">One question, then pocket it</p>
            <p className="mt-2 font-medium text-pretty">{story.trivia.q}</p>
            <div className="mt-2 grid gap-2">
              {story.trivia.options.map((opt, i) => {
                const show = answered;
                const isAnswer = i === story.trivia.answer;
                const isPick = i === picked;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={answered}
                    onClick={() => {
                      setPicked(i);
                      onTrivia(i === story.trivia.answer ? "right" : "wrong");
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !show && "hover:border-sindoor/40 hover:bg-sindoor/5",
                      show && isAnswer && "border-grass bg-grass/10",
                      show && isPick && !isAnswer && "border-destructive/50 bg-destructive/10",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="mt-2 text-sm text-muted-foreground">
                {correct ? "That's it. Now look up — the real thing is in front of you." : "Not that one. The answer is marked in green."}
              </p>
            )}
          </div>
        </>
      )}
      <Button size="lg" className="h-11 w-full" onClick={onContinue} disabled={Boolean(story) && !answered}>
        {story && !answered ? "Answer to continue" : "On to the next"}
      </Button>
    </div>
  );
}
