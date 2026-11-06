// "mañana", "el viernes", "in 3 days" -> YYYY-MM-DD. The model tries this too, but date math
// shouldn't depend on it. Vague phrases ("next week") stay unresolved and become a question.

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function shift(ref: string, days: number): string {
  const [y, m, d] = ref.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// "viernes 13", "Nov 13", "13/11" are not relative
function hasCalendarDay(text: string): boolean {
  return /\b\d{1,2}\s*(de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\b/.test(text)
    || /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s+\d{1,2}\b/.test(text)
    || /\b\d{1,2}[/-]\d{1,2}\b/.test(text)
    || new RegExp(`\\b(${Object.keys(WEEKDAYS).join("|")})\\s+\\d{1,2}\\b`).test(text);
}

export function resolveRelative(text: string | null | undefined, ref: string): string | null {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(ref)) return null;
  const s = text.toLowerCase().replace(/\s+/g, " ");
  if (hasCalendarDay(s)) return null;

  if (/\b(pasado mañana|pasado manana|day after tomorrow)\b/.test(s)) return shift(ref, 2);
  // "por la mañana" means morning, not tomorrow
  if (/\btomorrow\b/.test(s) || /(?<!\b(la|esta|cada|una|toda)\s)\bma[ñn]ana\b/.test(s)) return shift(ref, 1);
  if (/\b(hoy|today|tonight|esta noche)\b/.test(s)) return ref;

  const inDays = s.match(/\b(?:en|in|dentro de)\s+(\d{1,2}|[a-zñ]+)\s+(d[ií]as?|days?)\b/);
  if (inDays) {
    const n = Number(inDays[1]) || NUMBERS[inDays[1]];
    if (n) return shift(ref, n);
  }

  const named = s.match(new RegExp(`(?<![\\p{L}])(${Object.keys(WEEKDAYS).join("|")})(?![\\p{L}])`, "u"));
  if (named && !/\b(cada|todos los|every)\b/.test(s)) {
    const [y, m, d] = ref.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return shift(ref, (WEEKDAYS[named[1]] - from + 7) % 7 || 7); // never today
  }
  return null;
}
