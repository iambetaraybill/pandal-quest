import { askDhaki } from "@/lib/ai/dhaki";
import { aiReady, aiStatus } from "@/lib/ai/status";
import { AskRequest } from "@/lib/api-schemas";
import { ndjsonResponse } from "@/lib/ndjson";

export async function POST(req: Request) {
  const parsed = AskRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { messages, day, time } = parsed.data;

  return ndjsonResponse(async (send) => {
    if (!aiReady(await aiStatus())) {
      send({
        type: "answer",
        text: "Dhaki needs the local model to answer free-form questions. Start Ollama with a Gemma model (see the README) and ask again. Planning and walking still work without it.",
        stats: null,
      });
      return;
    }
    for await (const event of askDhaki(messages, { day, time })) send(event);
  });
}
