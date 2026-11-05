export const runtime = "nodejs";

const MAX_BYTES = 256 * 1024;

// POST form { ics, name } -> the same calendar back as a real text/calendar response.
// iPhones open their "Add to calendar" sheet for a served file, but not reliably for a blob download.
// Nothing is stored or logged. Form fields rather than a URL, so assignment titles stay out of access logs.
export async function POST(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return new Response("Forbidden", { status: 403 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response("Too large", { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const ics = form.get("ics");
  if (typeof ics !== "string" || ics.length > MAX_BYTES || !ics.startsWith("BEGIN:VCALENDAR")) {
    return new Response("Bad request", { status: 400 });
  }
  const name = String(form.get("name") ?? "clara").replace(/[^\w-]+/g, "-").slice(0, 40) || "clara";
  return new Response(ics.replace(/\r?\n/g, "\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${name}.ics"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
