"use client";

import { ArrowUp, Loader2, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAiHealth } from "@/components/ai-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { prettyModel } from "@/lib/format";
import { readNdjson } from "@/lib/ndjson";
import type { AiStats, PujaDayId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToolTrace {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: ToolTrace[];
  stats?: AiStats | null;
  pending?: boolean;
}

type AskEvent =
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "answer"; text: string; stats: AiStats | null }
  | { type: "error"; message: string }
  | { type: "done" };

const SUGGESTIONS = [
  "When is Bagbazar least crowded on Ashtami?",
  "How far is Kumartuli from Shobhabazar Rajbari on foot?",
  "Which metro is closest to Santosh Mitra Square?",
  "Any quiet bonedi bari pujas in North Kolkata?",
];

function argSummary(args: Record<string, unknown>): string {
  return Object.values(args)
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map((v) => String(v))
    .join(", ");
}

export function AskDhaki({
  open,
  onOpenChange,
  day,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day?: PujaDayId;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const health = useAiHealth();
  const endRef = useRef<HTMLDivElement | null>(null);
  const aiReady = health.status === "ok" && health.health.ready;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const updateLast = (fn: (m: Msg) => Msg) =>
    setMsgs((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const history = [
      ...msgs.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content.slice(0, 800) })),
      { role: "user" as const, content: question },
    ].slice(-16);
    setMsgs((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "", tools: [], pending: true }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, day: day ?? "saptami", time: "19:00" }),
      });
      if (!res.ok) throw new Error(`Server said ${res.status}`);
      await readNdjson<AskEvent>(res, (e) => {
        if (e.type === "tool_call") {
          updateLast((m) => ({ ...m, tools: [...(m.tools ?? []), { name: e.name, args: e.args }] }));
        } else if (e.type === "tool_result") {
          updateLast((m) => {
            const tools = [...(m.tools ?? [])];
            const i = tools.findLastIndex((t) => t.name === e.name && t.result === undefined);
            if (i >= 0) tools[i] = { ...tools[i], result: e.result };
            return { ...m, tools };
          });
        } else if (e.type === "answer") {
          updateLast((m) => ({ ...m, content: e.text, stats: e.stats, pending: false }));
        } else if (e.type === "error") {
          updateLast((m) => ({ ...m, content: `Something went wrong: ${e.message}`, pending: false }));
        }
      });
    } catch {
      updateLast((m) => ({
        ...m,
        content: "I can't reach the Pandal Quest server right now. Planning and walking still work offline; I just can't chat.",
        pending: false,
      }));
    } finally {
      setBusy(false);
      updateLast((m) => ({ ...m, pending: false }));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="font-display text-xl font-semibold">Ask Dhaki</SheetTitle>
          <SheetDescription>
            A pandal guide running on {aiReady && health.status === "ok" ? prettyModel(health.health.model) : "your local model"}. It
            looks up crowds, distances and stations with tools instead of guessing.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!msgs.length && (
            <div className="grid gap-2">
              {!aiReady && health.status !== "loading" && (
                <p className="rounded-lg bg-marigold/15 p-3 text-xs text-pretty text-foreground/80">
                  Dhaki needs a local model to chat. Start Ollama with a Gemma model (see the README). Planning and walking
                  don&apos;t need it.
                </p>
              )}
              <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Try asking</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-sindoor/40 hover:bg-sindoor/5"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card",
                  )}
                >
                  {m.tools && m.tools.length > 0 && (
                    <div className="mb-2 grid gap-1">
                      {m.tools.map((t, j) => (
                        <details key={j} className="group rounded-md bg-muted/70 px-2 py-1">
                          <summary className="flex cursor-pointer items-center gap-1.5 font-mono text-[11px] text-muted-foreground select-none">
                            <Wrench className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">
                              {t.name}({argSummary(t.args)})
                            </span>
                            {t.result === undefined && <Loader2 className="size-3 animate-spin" aria-hidden />}
                          </summary>
                          {t.result !== undefined && (
                            <pre className="mt-1 max-h-40 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-foreground/80">
                              {JSON.stringify(t.result, null, 2)}
                            </pre>
                          )}
                        </details>
                      ))}
                    </div>
                  )}
                  {m.pending && !m.content ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      {m.tools?.length ? "Reading the results…" : "Thinking…"}
                    </span>
                  ) : (
                    <p className="whitespace-pre-line">{m.content}</p>
                  )}
                  {m.stats && m.stats.tokens > 0 && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground tabular">
                      {prettyModel(m.stats.model)} · {m.stats.tokensPerSec.toFixed(1)} tok/s · on this machine
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="When is Suruchi Sangha calm on Navami?"
            maxLength={800}
            aria-label="Ask Dhaki"
            className="h-10"
          />
          <Button type="submit" size="icon-lg" className="size-10" disabled={busy || !input.trim()} aria-label="Send">
            {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
