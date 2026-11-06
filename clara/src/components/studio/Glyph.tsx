import type { ReactNode } from "react";
import { isGlyph, type Glyph as GlyphName } from "@/lib/glyphs";

// One drawing per name in lib/glyphs.ts. Decorative, figures carry their own text.

const C = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} />;

const draw: Record<GlyphName, ReactNode> = {
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z" />,
  target: <>{C(12, 12, 9)}{C(12, 12, 5)}{C(12, 12, 1)}</>,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M19 19v2H6" />,
  pencil: <path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4" />,
  clock: <>{C(12, 12, 9)}<path d="M12 7v5l3 2" /></>,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  check: <path d="M5 12l4 4 10-10" />,
  lightbulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />,
  puzzle: <path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z" />,
  map: <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  search: <>{C(11, 11, 7)}<path d="M20 20l-4-4" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  calendar: <path d="M4 7h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  people: <>{C(9, 8, 3)}{C(17, 9, 2.5)}<path d="M3 20a6 6 0 0 1 12 0M15.5 14.5A5 5 0 0 1 21 19" /></>,
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" />,
  question: <>{C(12, 12, 9)}<path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7v.5M12 17h.01" /></>,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6" />,
  ball: <>{C(12, 12, 9)}<path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4zM12 3v4.5M20.5 9.5l-4.5.9M17.5 19l-3-3.9M6.5 19l3-3.9M3.5 9.5l4.5.9" /></>,
  goal: <path d="M3 19V6h18v13M6 9h12v10M6 9 3 6M18 9l3-3M6 12.5h12M6 16h12M10 9v10M14 9v10" />,
  whistle: <>{C(9, 14, 5)}<path d="M12.5 10.5 21 7v4l-5 1.5M9 14h.01M6 5l1.5 2M10 4v2.5" /></>,
  boot: <path d="M5 4h6v7l7 2a3 3 0 0 1 3 3v2H5zM5 18v2M9 18v2M13 18v2M17 18v2" />,
  jersey: <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z" />,
  card: <path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />,
  hoop: <path d="M4 3h16v7H4zM9 6h6v4M7 10l1.5 9M17 10l-1.5 9M7.5 13h9M8 16h8M12 10v9" />,
  basketball: <>{C(12, 12, 9)}<path d="M3 12h18M12 3v18M5.6 5.6a12 12 0 0 1 0 12.8M18.4 5.6a12 12 0 0 0 0 12.8" /></>,
  note: <>{C(6, 18, 3)}{C(17, 16, 3)}<path d="M9 18V5l11-2v13" /></>,
  headphones: <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z" />,
  guitar: <>{C(8, 16, 4.5)}<path d="M15 3l6 6M18 6l-7.5 7.5M8 16h.01" /></>,
  mic: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" />,
  vinyl: <>{C(12, 12, 9)}{C(12, 12, 3)}<path d="M12 12h.01M7 8.5a6 6 0 0 1 3-2" /></>,
  gamepad: <path d="M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.5 1.7L15 13H9l-1.5 1.7A3 3 0 0 1 2 13v-1a4 4 0 0 1 4-4zM7 10.5v3M5.5 12h3M16 11h.01M18 13h.01" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  coin: <>{C(12, 12, 9)}<path d="M12 6.5v11M14.5 9h-3.5a1.75 1.75 0 0 0 0 3.5h2a1.75 1.75 0 0 1 0 3.5H9.5" /></>,
  sword: <path d="M14.5 4H20v5.5L9 20.5 3.5 15zM7 13l4 4M3.5 20.5l3-3" />,
  level: <path d="M3 20h4v-4h4v-4h4V8h4V4h2" />,
  rocket: <path d="M12 3c3 2 5 5.5 5 9.5L15 17H9l-2-4.5C7 8.5 9 5 12 3zM12 10h.01M9 17l-2 4M15 17l2 4M12 17v4" />,
  planet: <>{C(12, 12, 6)}<path d="M2.5 15.5c1 1.8 9-.5 14.5-4S22 7 20.5 6.5" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  train: <path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 11h16M8 15h.01M16 15h.01M8 18l-2 3M16 18l2 3" />,
  track: <path d="M8 3 5 21M16 3l3 18M6.5 7h11M6 12h12M5.3 17h13.4" />,
  signal: <path d="M12 22V11M8 22h8M9 3h6v8H9zM12 5.5h.01M12 8.5h.01" />,
  ticket: <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10" />,
  paw: <>{C(6, 10, 1.6)}{C(18, 10, 1.6)}{C(9.5, 6, 1.6)}{C(14.5, 6, 1.6)}<path d="M12 12c-3 0-5 3-5 5.5A2 2 0 0 0 9 19.5c1 0 2-.5 3-.5s2 .5 3 .5a2 2 0 0 0 2-2c0-2.5-2-5.5-5-5.5z" /></>,
  leaf: <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l8-8" />,
  brush: <path d="M18 3l3 3-9 9-3-3zM9 12c-3 0-4 2-4 4s-1 3-2 3c2 2 8 2 9-3" />,
  palette: <>{C(8, 10, 1)}{C(12, 7.5, 1)}{C(16, 10, 1)}<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.2-1.7-.4-1.2.4-2.3 1.7-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" /></>,
  frame: <path d="M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4" />,
};

export function Glyph({ name, size = 22 }: { name: string; size?: number }) {
  const n = isGlyph(name) ? name : "star";
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {draw[n]}
    </svg>
  );
}
