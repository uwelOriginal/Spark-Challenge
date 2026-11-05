// Names of the pictures the AI may place in a figure. The model picks from this list only
// (it is an enum in the schema), so it can never inject markup; the drawings live in
// components/studio/Glyph.tsx.

export const GLYPHS = [
  // general study
  "star", "target", "book", "pencil", "clock", "flag", "check", "lightbulb", "puzzle", "map", "chat", "search",
  "list", "calendar", "mail", "people", "chart", "question", "trophy",
  // football and basketball
  "ball", "goal", "whistle", "boot", "jersey", "card", "hoop", "basketball",
  // music
  "note", "headphones", "guitar", "mic", "vinyl",
  // video games
  "gamepad", "heart", "coin", "sword", "level",
  // space
  "rocket", "planet", "moon",
  // trains
  "train", "track", "signal", "ticket",
  // animals and nature
  "paw", "leaf",
  // art
  "brush", "palette", "frame",
] as const;

export type Glyph = (typeof GLYPHS)[number];

export function isGlyph(x: unknown): x is Glyph {
  return typeof x === "string" && (GLYPHS as readonly string[]).includes(x);
}
