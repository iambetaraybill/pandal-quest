import { connection } from "next/server";
import { aiReady, aiStatus } from "@/lib/ai/status";

export async function GET() {
  await connection();
  const status = await aiStatus();
  return Response.json({ ...status, ready: aiReady(status) }, { headers: { "cache-control": "no-store" } });
}
