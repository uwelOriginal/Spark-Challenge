import type { Glyph } from "./glyphs";
import type { Chat, Theme } from "./schemas";
import type { Accent, Font, Layout, Settings, TextSize, Theme as ColorTheme } from "./store";

// Personal layer (docs/15). Literal facts never change. Themed names, groups, analogies and figures
// are generated on top and checked here, so they can only relabel what's already there.

export const PACK_IDS = ["football", "basketball", "music", "videogames", "space", "trains", "animals", "art", "generic"] as const;
export type PackId = (typeof PACK_IDS)[number];

export type Depth = "off" | "light" | "full"; // full adds analogies
export type Motion = "off" | "calm" | "full";

export type Pack = {
  id: PackId;
  label: { es: string; en: string };
  hue: number;
  glyphs: Glyph[]; // first is the pack's symbol
  finish: Glyph;
  keywords: string[];
};

export const PACKS: Record<PackId, Pack> = {
  football: { id: "football", label: { es: "Fútbol", en: "Football" }, hue: 135, glyphs: ["ball", "boot", "whistle", "jersey", "card", "trophy"], finish: "goal", keywords: ["futbol", "fútbol", "football", "soccer", "liga", "gol", "messi", "real madrid", "barça", "barcelona", "america", "chivas", "tigres", "rayados", "pumas", "premier", "champions", "mundial"] },
  basketball: { id: "basketball", label: { es: "Básquetbol", en: "Basketball" }, hue: 25, glyphs: ["basketball", "jersey", "whistle", "trophy", "people"], finish: "hoop", keywords: ["basquet", "básquet", "basketball", "baloncesto", "nba", "lakers", "warriors", "basket"] },
  music: { id: "music", label: { es: "Música", en: "Music" }, hue: 290, glyphs: ["note", "headphones", "guitar", "mic", "vinyl"], finish: "star", keywords: ["musica", "música", "music", "banda", "band", "guitarra", "guitar", "piano", "k-pop", "kpop", "rock", "rap", "cantar", "sing", "taylor", "bts", "concierto", "concert"] },
  videogames: { id: "videogames", label: { es: "Videojuegos", en: "Video games" }, hue: 255, glyphs: ["gamepad", "coin", "heart", "sword", "level"], finish: "trophy", keywords: ["videojuego", "video game", "videogame", "gaming", "gamer", "minecraft", "zelda", "pokemon", "pokémon", "fortnite", "mario", "nintendo", "xbox", "playstation", "rpg", "roblox", "valorant", "league of legends"] },
  space: { id: "space", label: { es: "Espacio", en: "Space" }, hue: 220, glyphs: ["rocket", "planet", "moon", "star"], finish: "planet", keywords: ["espacio", "space", "astronom", "planeta", "planet", "nasa", "cohete", "rocket", "estrellas", "stars", "star wars", "galaxia", "galaxy", "universo"] },
  trains: { id: "trains", label: { es: "Trenes", en: "Trains" }, hue: 200, glyphs: ["train", "track", "signal", "ticket", "clock"], finish: "signal", keywords: ["tren", "train", "railway", "ferrocarril", "metro", "subway", "locomotora", "transporte", "transit"] },
  animals: { id: "animals", label: { es: "Animales y naturaleza", en: "Animals and nature" }, hue: 95, glyphs: ["paw", "leaf", "heart", "map"], finish: "leaf", keywords: ["animal", "perro", "dog", "gato", "cat", "naturaleza", "nature", "dinosaur", "dinosaurio", "biolog", "plantas", "plants", "caballo", "horse", "pájaro", "bird"] },
  art: { id: "art", label: { es: "Arte y dibujo", en: "Art and drawing" }, hue: 340, glyphs: ["brush", "palette", "frame", "pencil"], finish: "frame", keywords: ["arte", "art", "dibujo", "drawing", "pintura", "painting", "anime", "manga", "diseño", "design", "comic", "cómic", "ilustra"] },
  generic: { id: "generic", label: { es: "General", en: "General" }, hue: 210, glyphs: ["star", "target", "lightbulb", "puzzle", "book"], finish: "trophy", keywords: [] },
};

export function guessPack(interest: string): PackId {
  const text = interest.toLowerCase();
  if (!text.trim()) return "generic";
  let best: PackId = "generic";
  let score = 0;
  for (const p of Object.values(PACKS)) {
    const s = p.keywords.reduce((n, k) => n + (text.includes(k) ? k.length : 0), 0);
    if (s > score) [best, score] = [p.id, s];
  }
  return best;
}

export function isActive(s: Pick<Settings, "interest" | "depth">): boolean {
  return s.depth !== "off" && s.interest.trim().length > 0;
}

export function packFor(s: Pick<Settings, "interest" | "pack">, themed?: { pack: PackId } | null): Pack {
  if (s.pack !== "auto") return PACKS[s.pack];
  return PACKS[themed?.pack ?? guessPack(s.interest)];
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// new key means remake
export function themeKey(s: Pick<Settings, "interest" | "pack" | "depth" | "lang" | "dialect">, steps: { action: string }[]): string {
  return hash([s.interest.trim().toLowerCase(), s.pack, s.depth, s.lang, s.dialect, ...steps.map((x) => x.action)].join("§"));
}

// Theme checks

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const validIndex = (i: unknown, n: number): i is number => typeof i === "number" && Number.isInteger(i) && i >= 0 && i < n;

// things an analogy must not invent
const FACT_PATTERN = /\b\d{1,2}:\d{2}\b|\b\d{1,2}[/-]\d{1,2}\b|\b20\d{2}\b|\b\d+(?:[.,]\d+)?\s?%/g;

// empty list means it passes
export function themeProblems(t: Theme, nSteps: number, nDeadlines: number, depth: Depth, facts: string): string[] {
  const problems: string[] = [];
  if (t.step_labels.length !== nSteps) problems.push("labels");
  const seen = t.groups.flatMap((g) => g.steps);
  const covered = new Set(seen.filter((i) => validIndex(i, nSteps)));
  if (covered.size !== nSteps || seen.length !== nSteps) problems.push("groups");
  const refs = t.scenes.flatMap((s) => s.items).some((it) => (it.step !== null && !validIndex(it.step, nSteps)) || (it.deadline !== null && !validIndex(it.deadline, nDeadlines)));
  if (refs) problems.push("refs");
  if (depth === "full" && t.analogies.length === 0) problems.push("no_analogies");
  if (t.analogies.some((a) => !a.where_it_breaks.trim())) problems.push("no_limits");
  const known = new Set(facts.match(FACT_PATTERN) ?? []);
  const themed = [t.intro, ...t.step_labels, ...t.groups.map((g) => g.label), ...t.analogies.flatMap((a) => [a.analogy, a.where_it_breaks])].join(" ");
  if ((themed.match(FACT_PATTERN) ?? []).some((f) => !known.has(f))) problems.push("invented_fact");
  return problems;
}

// fix what we can so the UI never gets a broken reference
export function sanitizeTheme(t: Theme, nSteps: number, nDeadlines: number, depth: Depth): Theme {
  const taken = new Set<number>();
  let groups = t.groups
    .map((g) => ({
      label: clip(g.label.trim(), 40),
      icon: g.icon,
      steps: [...new Set(g.steps)].filter((i) => validIndex(i, nSteps) && !taken.has(i) && (taken.add(i), true)).sort((a, b) => a - b),
    }))
    .filter((g) => g.label && g.steps.length > 0);
  const missing = Array.from({ length: nSteps }, (_, i) => i).filter((i) => !taken.has(i));
  if (missing.length > 0) {
    if (groups.length === 0) groups = [{ label: "", icon: "list", steps: missing }];
    else for (const i of missing) {
      // forgotten step goes with the previous step's group
      const g = groups.find((x) => x.steps.includes(i - 1)) ?? groups[groups.length - 1];
      g.steps = [...g.steps, i].sort((a, b) => a - b);
    }
  }
  groups.sort((a, b) => a.steps[0] - b.steps[0]);

  return {
    pack: t.pack,
    intro: clip(t.intro.trim(), 400),
    step_labels: Array.from({ length: nSteps }, (_, i) => clip((t.step_labels[i] ?? "").trim(), 60)),
    groups,
    analogies: depth === "full" ? t.analogies.slice(0, 4).map((a) => ({ ...a, concept: clip(a.concept, 60), analogy: clip(a.analogy, 400), where_it_breaks: clip(a.where_it_breaks, 300) })) : [],
    scenes: t.scenes.map((s) => sanitizeScene(s, nSteps, nDeadlines)).filter((s) => s.items.length >= 2).slice(0, 3),
  };
}

export function sanitizeScene<S extends Theme["scenes"][number]>(s: S, nSteps: number, nDeadlines: number): S {
  return {
    ...s,
    title: clip(s.title.trim(), 70),
    alt: clip(s.alt.trim(), 300),
    items: s.items.slice(0, 8).map((it) => ({
      ...it,
      label: clip(it.label.trim(), 40),
      note: it.note ? clip(it.note.trim(), 120) : null,
      step: validIndex(it.step, nSteps) ? it.step : null,
      deadline: validIndex(it.deadline, nDeadlines) ? it.deadline : null,
    })),
  };
}

// Settings proposals

export type SettingsChange = Chat["settings_change"];

const THEMES: ColorTheme[] = ["dark", "light", "contrast"];
const ACCENTS: Accent[] = ["blue", "teal", "yellow", "violet", "rose"];
const FONTS: Font[] = ["atkinson", "lexend", "system"];
const SIZES: TextSize[] = ["s", "m", "l", "xl"];
const LAYOUTS: Layout[] = ["side", "swap", "stacked", "tabs"];
export const VOICE_RATES = { slow: 0.75, normal: 0.95, fast: 1.15 } as const;

const pick = <T extends string>(allowed: readonly T[], v: unknown): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined);

// Only display and personalization keys. The model can't touch name, reminders or data.
export function changeToPatch(c: SettingsChange | null | undefined, lang: "es" | "en" = "es"): Partial<Settings> {
  if (!c?.wanted) return {};
  const p: Partial<Settings> = {
    theme: pick(THEMES, c.theme),
    accent: pick(ACCENTS, c.accent),
    font: pick(FONTS, c.font),
    textSize: pick(SIZES, c.text_size),
    controlSize: pick(["m", "l", "xl"] as const, c.control_size),
    spacing: pick(["normal", "relaxed"] as const, c.spacing),
    layout: pick(LAYOUTS, c.layout),
    motion: pick(["off", "calm", "full"] as const, c.motion),
    depth: pick(["off", "light", "full"] as const, c.depth),
    pack: c.pack === "auto" ? "auto" : pick(PACK_IDS, c.pack),
  };
  const rate = pick(Object.keys(VOICE_RATES) as (keyof typeof VOICE_RATES)[], c.voice_rate);
  if (rate) p.voiceRate = VOICE_RATES[rate];
  if (typeof c.interest === "string" && c.interest.trim()) {
    p.interest = c.interest.trim().slice(0, 80);
    if (!p.depth) p.depth = "full";
  } else if (p.pack && p.pack !== "auto" && p.pack !== "generic") {
    // new theme, no new interest text: use the theme's name
    p.interest = PACKS[p.pack].label[lang];
  }
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<Settings>;
}

// for Undo
export function undoFor(patch: Partial<Settings>, current: Settings): Partial<Settings> {
  return Object.fromEntries(Object.keys(patch).map((k) => [k, current[k as keyof Settings]])) as Partial<Settings>;
}

// never includes the name
export function profileFor(s: Settings) {
  return {
    interest: isActive(s) ? s.interest.trim().slice(0, 80) : "",
    depth: isActive(s) ? s.depth : ("off" as Depth),
    current: { theme: s.theme, accent: s.accent, font: s.font, text_size: s.textSize, control_size: s.controlSize, spacing: s.spacing, layout: s.layout, motion: s.motion, pack: s.pack },
  };
}
export type Profile = ReturnType<typeof profileFor>;
