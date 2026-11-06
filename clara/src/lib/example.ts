import samples from "@/samples/briefs.json";
import { parseTranscriptFile, speakerStats, transcriptText } from "./transcript";
import type { Lang } from "./schemas";
import type { Source } from "./store";

// Built-in example, synthetic (samples/briefs.json): brief plus class transcript.

export function exampleSources(lang: Lang): Source[] {
  const sfx = lang === "en" ? "_en" : "";
  const brief = samples.briefs.find((b) => b.id === `etica_v1${sfx}`)!;
  const cls = samples.class_transcripts.find((c) => c.id === `etica_clase${sfx}`)!;
  const segments = parseTranscriptFile(cls.vtt);
  const professor = speakerStats(segments)[0]?.speaker ?? "Profesora";
  const now = new Date().toISOString();
  return [
    { id: "S1", kind: "brief", name: lang === "es" ? "Instrucciones en Canvas" : "Canvas instructions", text: brief.text, method: "example", addedAt: now },
    {
      id: "S2",
      kind: "class",
      name: lang === "es" ? "Clase del lunes (transcripción)" : "Monday's class (transcript)",
      text: transcriptText(segments, new Set([professor])),
      method: "example",
      addedAt: now,
    },
  ];
}

export function exampleNewVersion(lang: Lang = "es"): string {
  return samples.briefs.find((b) => b.id === (lang === "en" ? "etica_v2_en" : "etica_v2"))!.text;
}
