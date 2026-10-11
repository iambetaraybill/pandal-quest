import { aiReady, aiStatus } from "@/lib/ai/status";
import { StoriesRequest } from "@/lib/api-schemas";
import { getStory } from "@/lib/stories";
import type { StoryPack } from "@/lib/types";

export async function POST(req: Request) {
  const parsed = StoriesRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { ids, lang } = parsed.data;
  const live = aiReady(await aiStatus());
  const stories: StoryPack[] = [];
  for (const id of ids) {
    const s = await getStory(id, lang, { live });
    if (s) stories.push(s);
  }
  return Response.json({ stories });
}
