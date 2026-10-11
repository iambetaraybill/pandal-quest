import "server-only";

/**
 * Minimal client for a local Ollama server. No SDK: three endpoints, plain fetch,
 * so swapping in llama.cpp or any other runtime later is a small diff.
 */
export const OLLAMA_URL = (process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(/\/$/, "");
export const MODEL = process.env.PANDAL_QUEST_MODEL ?? "gemma4:e2b";
const KEEP_ALIVE = "30m";
const BASE_OPTIONS = { num_ctx: 4096 };

export type ChatRole = "system" | "user" | "assistant" | "tool";
export interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}
export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
}
export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}
export interface GenStats {
  model: string;
  tokens: number;
  tokensPerSec: number;
  ms: number;
}

interface OllamaChatResponse {
  message?: ChatMessage;
  done?: boolean;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
  error?: string;
}

function statsFrom(r: OllamaChatResponse, startedAt: number): GenStats {
  const tokens = r.eval_count ?? 0;
  const evalSec = (r.eval_duration ?? 0) / 1e9;
  return {
    model: MODEL,
    tokens,
    tokensPerSec: evalSec > 0 ? Math.round((tokens / evalSec) * 10) / 10 : 0,
    ms: Date.now() - startedAt,
  };
}

export interface Health {
  reachable: boolean;
  model: string;
  modelPresent: boolean;
  version?: string;
  host: string;
}

export async function health(): Promise<Health> {
  const base = { reachable: false, model: MODEL, modelPresent: false, host: OLLAMA_URL };
  try {
    const [v, tags] = await Promise.all([
      fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(1500) }).then((r) => r.json()),
      fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) }).then((r) => r.json()),
    ]);
    const names: string[] = (tags.models ?? []).map((m: { name: string }) => m.name);
    const wanted = MODEL.includes(":") ? MODEL : `${MODEL}:latest`;
    return { ...base, reachable: true, version: v.version, modelPresent: names.includes(wanted) };
  } catch {
    return base;
  }
}

async function post(body: Record<string, unknown>, timeoutMs: number): Promise<Response> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, keep_alive: KEEP_ALIVE, think: false, ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

/** Grammar-constrained JSON: Ollama guarantees output that parses against `schema`. */
export async function chatJSON<T>(
  messages: ChatMessage[],
  schema: Record<string, unknown>,
  { temperature = 0.1, timeoutMs = 120_000 } = {},
): Promise<{ data: T; stats: GenStats }> {
  const startedAt = Date.now();
  const res = await post(
    { messages, stream: false, format: schema, options: { ...BASE_OPTIONS, temperature } },
    timeoutMs,
  );
  const json = (await res.json()) as OllamaChatResponse;
  if (json.error) throw new Error(json.error);
  return { data: JSON.parse(json.message?.content ?? "{}") as T, stats: statsFrom(json, startedAt) };
}

/** Streams text tokens; the final yielded value carries generation stats. */
export async function* chatStream(
  messages: ChatMessage[],
  { temperature = 0.7, timeoutMs = 180_000, numPredict = 400 } = {},
): AsyncGenerator<{ token: string } | { stats: GenStats }> {
  const startedAt = Date.now();
  const res = await post(
    { messages, stream: true, options: { ...BASE_OPTIONS, temperature, num_predict: numPredict } },
    timeoutMs,
  );
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const chunk = JSON.parse(line) as OllamaChatResponse;
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.message?.content) yield { token: chunk.message.content };
      if (chunk.done) yield { stats: statsFrom(chunk, startedAt) };
    }
  }
}

/** One non-streaming turn with native tool calling (Gemma 4 emits structured tool_calls). */
export async function chatTools(
  messages: ChatMessage[],
  tools: ToolSpec[],
  { temperature = 0.2, timeoutMs = 120_000 } = {},
): Promise<{ message: ChatMessage; stats: GenStats }> {
  const startedAt = Date.now();
  const res = await post({ messages, tools, stream: false, options: { ...BASE_OPTIONS, temperature } }, timeoutMs);
  const json = (await res.json()) as OllamaChatResponse;
  if (json.error) throw new Error(json.error);
  return { message: json.message ?? { role: "assistant", content: "" }, stats: statsFrom(json, startedAt) };
}
