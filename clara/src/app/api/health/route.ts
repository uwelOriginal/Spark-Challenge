import { routeOrder } from "@/lib/llm";

// GET -> which optional features are configured
export const runtime = "nodejs";

export function GET(req: Request) {
  const code = process.env.CLARA_ACCESS_CODE;
  return Response.json({
    accessCode: Boolean(code),
    authorized: !code || req.headers.get("x-clara-code") === code, // same check as guard()
    route: routeOrder(),
    audio: Boolean(process.env.GROQ_API_KEY || process.env.ELEVENLABS_API_KEY),
  }, { headers: { "Cache-Control": "no-store" } });
}
