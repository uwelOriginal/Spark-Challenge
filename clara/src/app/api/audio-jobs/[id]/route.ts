import { guard, json } from "@/lib/guard";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

// GET -> job progress, then transcript and passages
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = guard(req, { rateLimit: false });
  if (blocked) return blocked;
  const job = getJob((await params).id);
  if (!job) return json({ error: "not_found" }, 404);
  const done = job.status === "done";
  return json({
    id: job.id,
    fileName: job.fileName,
    status: job.status,
    duration: job.duration,
    parts: job.parts,
    transcribed: job.transcribed,
    extracted: job.extracted,
    waitingUntil: job.waitingUntil,
    error: job.error,
    transcript: done ? job.transcript : null,
    passages: done ? job.passages : null,
  });
}
