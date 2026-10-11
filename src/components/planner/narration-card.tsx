"use client";

import { Cpu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prettyModel } from "@/lib/format";
import type { AiStats } from "@/lib/types";

interface Props {
  text: string;
  source: "gemma" | "template" | null;
  model: string | null;
  streaming: boolean;
  stats: AiStats | null;
  stale: boolean;
  busy: boolean;
  onRewrite: () => void;
  lang: "en" | "bn";
}

export function NarrationCard({ text, source, model, streaming, stats, stale, busy, onRewrite, lang }: Props) {
  const by =
    source === "gemma"
      ? `Written by ${prettyModel(stats?.model ?? model)} on this machine`
      : source === "template"
        ? "Plain template: no local model was running"
        : streaming
          ? "Writing…"
          : "";
  return (
    <Card className="laal-paar pt-7">
      <CardHeader>
        <CardTitle className="font-display text-xl font-semibold">Your guide&apos;s note</CardTitle>
        <CardDescription>{by}</CardDescription>
        {stale && !busy && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={onRewrite}>
              <RefreshCw /> Rewrite
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {text ? (
          <p
            lang={lang === "bn" && source === "gemma" ? "bn" : undefined}
            className={`text-[15px] leading-relaxed text-pretty whitespace-pre-line ${lang === "bn" && source === "gemma" ? "font-bn" : ""}`}
          >
            {text.trim()}
            {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-sindoor" aria-hidden />}
          </p>
        ) : (
          <div className="grid gap-2" aria-label="Waiting for the guide">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {stale && (
          <p className="mt-3 text-xs text-muted-foreground">
            You changed the route after this was written. The stops below are current; tap Rewrite for a fresh note.
          </p>
        )}
      </CardContent>
      {stats && stats.tokens > 0 && (
        <CardFooter className="flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular">
          <span className="inline-flex items-center gap-1.5">
            <Cpu className="size-3.5" aria-hidden />
            {prettyModel(stats.model)}
          </span>
          <span>{stats.tokens} tokens</span>
          <span>{stats.tokensPerSec.toFixed(1)} tok/s</span>
          <span>{(stats.ms / 1000).toFixed(1)} s</span>
          <span className="font-medium text-foreground/80">0 bytes sent to the cloud</span>
        </CardFooter>
      )}
    </Card>
  );
}
