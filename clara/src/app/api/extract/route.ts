import { errorResponse, guard, json, LIMITS } from "@/lib/guard";
import { IMAGE_TYPES, transcribe } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST multipart { file } -> { text, method }.
// Text PDFs are read locally. Scans and images go to the model.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!(file instanceof File)) return json({ error: "bad_request" }, 400);
  if (file.size > LIMITS.maxFileBytes) return json({ error: "file_too_big" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  try {
    if (isPdf) {
      const text = await pdfText(bytes);
      if (text.trim().length >= LIMITS.minChars) return json({ text, method: "pdf_text" });
      return json({ text: await transcribe({ kind: "pdf", base64 }), method: "ai_transcription" });
    }
    if (IMAGE_TYPES.includes(file.type)) {
      const mediaType = file.type as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
      return json({ text: await transcribe({ kind: "image", mediaType, base64 }), method: "ai_transcription" });
    }
    return json({ error: "unsupported_file" }, 400);
  } catch (e) {
    return errorResponse(e);
  }
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
