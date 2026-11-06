import { errorResponse, guard, json, LIMITS } from "@/lib/guard";
import { transcribeAudio } from "@/lib/stt";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST multipart { file, lang? } -> { segments, language, diarization }.
// Audio goes to the STT provider and isn't stored here. The student then picks which voices to keep.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const file = form.get("file");
  const lang = form.get("lang") === "en" ? "en" : form.get("lang") === "es" ? "es" : undefined;
  if (!(file instanceof File)) return json({ error: "bad_request" }, 400);
  if (file.size > LIMITS.maxAudioBytes) return json({ error: "file_too_big" }, 400);
  if (!/^(audio|video)\//.test(file.type) && !/\.(m4a|mp3|wav|webm|ogg|mp4|aac|flac)$/i.test(file.name)) {
    return json({ error: "unsupported_file" }, 400);
  }

  try {
    return json(await transcribeAudio(file, lang));
  } catch (e) {
    return errorResponse(e);
  }
}
