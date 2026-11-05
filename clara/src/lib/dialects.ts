import type { Lang } from "./schemas";

// Regional variants inside each UI language. Shared by client and server.
// A dialect changes three things: how dates are written, which device voice reads aloud,
// and which regional variant the AI writes in. UI labels stay in neutral Spanish / English.

export const DIALECTS: Record<Lang, { id: string; label: string; ai: string }[]> = {
  es: [
    { id: "es-MX", label: "México", ai: "Spanish as written in Mexico" },
    { id: "es-US", label: "Estados Unidos", ai: "Spanish as written by Latinos in the United States" },
    { id: "es-CO", label: "Colombia", ai: "Spanish as written in Colombia" },
    { id: "es-AR", label: "Argentina", ai: "Spanish as written in Argentina (voseo is fine)" },
    { id: "es-ES", label: "España", ai: "Spanish as written in Spain" },
  ],
  en: [
    { id: "en-US", label: "United States", ai: "American English" },
    { id: "en-CA", label: "Canada", ai: "Canadian English" },
    { id: "en-GB", label: "United Kingdom", ai: "British English" },
  ],
};

export function defaultDialect(lang: Lang): string {
  return DIALECTS[lang][0].id;
}

/** A dialect that belongs to the language, or the language's default. */
export function validDialect(lang: Lang, dialect: unknown): string {
  return DIALECTS[lang].some((d) => d.id === dialect) ? (dialect as string) : defaultDialect(lang);
}

/** The "Output language: ..." value the prompts receive. Untrusted input is whitelisted. */
export function outputLanguage(lang: unknown, dialect: unknown): string {
  const l: Lang = lang === "en" ? "en" : "es";
  const id = validDialect(l, dialect);
  return DIALECTS[l].find((d) => d.id === id)!.ai;
}
