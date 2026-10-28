import { routeOrder } from "@/lib/llm";

// GET -> which optional features this server has configured (never returns secrets).
export const runtime = "nodejs";

export function GET() {
  return Response.json({
    accessCode: Boolean(process.env.CLARA_ACCESS_CODE),
    route: routeOrder(), // e.g. ["groq", "anthropic"]: free tier first, paid only on escalation
    audio: Boolean(process.env.GROQ_API_KEY || process.env.ELEVENLABS_API_KEY),
  });
}
