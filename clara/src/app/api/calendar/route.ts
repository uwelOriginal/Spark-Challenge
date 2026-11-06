export const runtime = "nodejs";

const MAX_BYTES = 256 * 1024;

// POST form { ics, name } -> same calendar as text/calendar.
// iPhones only open the add sheet reliably for a served file, not a blob.
// Form fields so titles stay out of access logs.
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
