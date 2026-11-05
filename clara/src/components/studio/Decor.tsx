import type { CSSProperties, ReactNode } from "react";
import type { Pack, PackId } from "@/lib/personal";
import { Glyph } from "./Glyph";

// Background pictures of the student's theme, behind the whole page (Settings → "Dibujos de fondo",
// or "Quitar fondo" in the Studio). Faint, fixed, never animated, never clickable, hidden from screen
// readers; panels stay solid on top, so text contrast does not change.

// Fixed spots (percent of the viewport, px size, degrees): mostly near the edges, where there is no text.
const SPOTS: [number, number, number, number][] = [
  [3, 14, 64, -12], [94, 10, 52, 14], [8, 38, 40, 8], [91, 33, 72, -6], [2, 62, 56, 18], [96, 58, 44, -16],
  [6, 86, 70, 6], [89, 82, 58, 10], [48, 4, 36, -8], [27, 94, 40, 12], [70, 95, 48, -10], [15, 24, 30, 20],
  [82, 22, 30, -20], [12, 74, 34, -4], [86, 68, 32, 8], [60, 88, 30, 16],
];

/** One large faint motif per theme, in the bottom corner: the field's lines, a stave, an orbit... */
function Motif({ pack, className = "decor-motif" }: { pack: PackId; className?: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 3 } as const;
  const art: Record<PackId, ReactNode> = {
    football: <><rect x="20" y="20" width="360" height="360" {...s} /><circle cx="380" cy="200" r="70" {...s} /><rect x="20" y="120" width="80" height="160" {...s} /><rect x="20" y="160" width="30" height="80" {...s} /></>,
    basketball: <><rect x="20" y="20" width="360" height="360" {...s} /><path d="M20 140h130v120H20M150 140a60 60 0 0 1 0 120M20 60a180 180 0 0 1 0 280" {...s} /></>,
    music: <><path d="M20 120h360M20 160h360M20 200h360M20 240h360M20 280h360" {...s} /><circle cx="140" cy="240" r="16" fill="currentColor" /><path d="M156 240V130" {...s} /><circle cx="260" cy="200" r="16" fill="currentColor" /><path d="M276 200V90" {...s} /></>,
    videogames: <>{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={40 + i * 55} y={320 - i * 45} width="50" height="50" {...s} />)}</>,
    space: <><circle cx="250" cy="250" r="40" {...s} /><ellipse cx="250" cy="250" rx="120" ry="50" {...s} /><ellipse cx="250" cy="250" rx="190" ry="90" {...s} strokeDasharray="8 10" /></>,
    trains: <><path d="M0 330C120 300 240 240 400 120M0 370C130 340 260 280 400 160" {...s} />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M${30 + i * 48} ${345 - i * 26}l14 34`} {...s} />)}</>,
    animals: <><path d="M0 330c80-70 160-70 240-20s110 20 160-20" {...s} /><circle cx="300" cy="110" r="40" {...s} /></>,
    art: <path d="M40 320c60-80 120 20 180-60s100-120 160-80M60 120c80 30 160-20 240 10" {...s} strokeWidth="12" strokeLinecap="round" />,
    generic: <>{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx="300" cy="300" r={40 + i * 50} {...s} />)}</>,
  };
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true">
      {art[pack]}
    </svg>
  );
}

/** The same motif as a watermark in a panel's corner, behind its text (too faint to affect contrast). */
export function PanelMotif({ pack }: { pack: Pack }) {
  return (
    <span className="panel-motif pack-scope" style={{ "--pack-h": pack.hue } as CSSProperties} aria-hidden="true">
      <Motif pack={pack.id} className="panel-motif-art" />
      <Glyph name={pack.glyphs[0]} size={56} />
    </span>
  );
}

export function Decor({ pack }: { pack: Pack }) {
  const glyphs = [...pack.glyphs, pack.finish];
  return (
    <div className="decor pack-scope" data-pack={pack.id} style={{ "--pack-h": pack.hue } as CSSProperties} aria-hidden="true">
      <Motif pack={pack.id} />
      {SPOTS.map(([x, y, size, rot], i) => (
        <span key={i} className="decor-item" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
          <Glyph name={glyphs[i % glyphs.length]} size={size} />
        </span>
      ))}
    </div>
  );
}
