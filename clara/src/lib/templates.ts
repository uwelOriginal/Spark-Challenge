import type { DecodeResult, Lang } from "./schemas";

// No AI here on purpose, the wording should be predictable.

export function professorMessage(
  lang: Lang,
  opts: { title: string; questions: string[]; profName: string; studentName: string },
): string {
  const { title, questions, profName, studentName } = opts;
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  if (lang === "en") {
    return [
      `Subject: Questions about "${title}"`,
      "",
      `Dear ${profName || "Professor"},`,
      "",
      `I am working on "${title}" and I want to make sure I understand the instructions correctly. Could you help me with these questions?`,
      "",
      list,
      "",
      "Thank you for your time.",
      "",
      studentName || "[Your name]",
    ].join("\n");
  }
  return [
    `Asunto: Dudas sobre "${title}"`,
    "",
    `Estimado/a ${profName || "profesor/a"}:`,
    "",
    `Estoy trabajando en "${title}" y quiero asegurarme de entender bien las instrucciones. ¿Me podría ayudar con estas preguntas?`,
    "",
    list,
    "",
    "Muchas gracias por su tiempo.",
    "",
    studentName || "[Tu nombre]",
  ].join("\n");
}

export function mentorSummary(
  lang: Lang,
  opts: { decode: DecodeResult; questions: string[]; doneSteps: string[]; note?: string },
): string {
  const { decode, questions, doneSteps, note = "" } = opts;
  const due = decode.deadlines.map((d) => `- ${d.item}: ${d.when}`).join("\n");
  const qs = questions.map((q) => `- ${q}`).join("\n");
  const done = doneSteps.map((s) => `- ${s}`).join("\n");
  const en = lang === "en";
  const parts = [
    en ? `Assignment: ${decode.title}` : `Tarea: ${decode.title}`,
    "",
    en ? "Due dates:" : "Fechas:",
    due || "-",
    "",
    en ? "Open questions I want to clarify:" : "Dudas que quiero aclarar:",
    qs || "-",
    "",
    en ? "What I have done so far:" : "Lo que ya hice:",
    done || "-",
  ];
  if (note.trim()) parts.push("", en ? "Where I feel stuck:" : "Dónde me siento atorado/a:", note.trim());
  return parts.join("\n");
}
