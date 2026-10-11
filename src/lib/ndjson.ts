/** Streams newline-delimited JSON events from an async producer. */
export function ndjsonResponse(produce: (send: (event: unknown) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await produce(send);
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

/** Client-side reader for the stream above. */
export async function readNdjson<T>(res: Response, onEvent: (event: T) => void): Promise<void> {
  if (!res.body) throw new Error("Empty response");
  const reader = res.body.getReader();
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
      if (line) onEvent(JSON.parse(line) as T);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as T);
}
