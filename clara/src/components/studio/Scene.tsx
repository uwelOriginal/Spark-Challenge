"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import type { Pack, PackId } from "@/lib/personal";
import type { Scene } from "@/lib/schemas";
import { Glyph } from "./Glyph";

// The Studio's drawing layer. Everything is drawn from data (a pack id, a list of items), never from
// markup the AI wrote. Colours come from the pack's hue and adapt to the theme in globals.css.
// Animation: elements marked data-anim move only when Settings → motion allows it.

const packStyle = (p: Pack) => ({ "--pack-h": p.hue }) as CSSProperties;

/** The pack's field, court, stage... drawn behind the board. */
function Backdrop({ pack }: { pack: PackId }) {
  const id = useId().replace(/:/g, "");
  const line = { fill: "none", stroke: "var(--line)", strokeWidth: 2 } as const;
  const art: Record<PackId, ReactNode> = {
    football: (
      <>
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 40} y="0" width="40" height="200" fill={i % 2 ? "var(--field-2)" : "var(--field)"} />)}
        <rect x="12" y="12" width="376" height="176" {...line} />
        <path d="M200 12v176" {...line} />
        <circle cx="200" cy="100" r="30" {...line} />
        <rect x="12" y="55" width="48" height="90" {...line} />
        <rect x="340" y="55" width="48" height="90" {...line} />
      </>
    ),
    basketball: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M0 ${i * 20 + 10}h400`} stroke="var(--field-2)" strokeWidth="2" />)}
        <rect x="12" y="12" width="376" height="176" {...line} />
        <path d="M200 12v176" {...line} />
        <circle cx="200" cy="100" r="26" {...line} />
        <path d="M12 70h70v60H12M82 70a30 30 0 0 1 0 60M388 70h-70v60h70M318 70a30 30 0 0 0 0 60" {...line} />
      </>
    ),
    music: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        <path d="M70 0 30 175h90zM200 0l-45 175h90zM330 0l-40 175h90z" fill="var(--line)" opacity="0.18" />
        <path d="M0 175h400" {...line} />
      </>
    ),
    videogames: (
      <>
        <defs>
          <pattern id={`px${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0v20" fill="none" stroke="var(--field-2)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="var(--field)" />
        <rect width="400" height="200" fill={`url(#px${id})`} />
        <path d="M0 180h120v-20h60v20h220" {...line} />
        <rect x="260" y="120" width="60" height="12" fill="var(--line)" opacity="0.35" />
      </>
    ),
    space: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        {Array.from({ length: 36 }, (_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53 + 17) % 200} r={i % 5 === 0 ? 1.8 : 1} fill="var(--line)" />)}
        <circle cx="360" cy="40" r="22" fill="var(--field-2)" />
        <ellipse cx="360" cy="40" rx="36" ry="8" {...line} />
      </>
    ),
    trains: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        <path d="M0 120c60-30 120-30 180-10s140 10 220-30V200H0z" fill="var(--field-2)" />
        {Array.from({ length: 27 }, (_, i) => <path key={i} d={`M${i * 15 + 4} 158v22`} stroke="var(--line)" strokeWidth="3" opacity="0.5" />)}
        <path d="M0 162h400M0 176h400" {...line} />
      </>
    ),
    animals: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        <circle cx="340" cy="45" r="20" fill="var(--line)" opacity="0.4" />
        <path d="M0 150c70-50 140-50 210-10s120 30 190-20V200H0z" fill="var(--field-2)" />
      </>
    ),
    art: (
      <>
        <rect width="400" height="200" fill="var(--field)" />
        <path d="M20 160c60-40 120 20 180-20s120-60 180-10" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.18" />
        <path d="M30 40c80 30 160-20 240 10" stroke="var(--field-2)" strokeWidth="18" strokeLinecap="round" fill="none" />
      </>
    ),
    generic: (
      <>
        <defs>
          <pattern id={`dot${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1.3" fill="var(--line)" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="200" fill="var(--field)" />
        <rect width="400" height="200" fill={`url(#dot${id})`} />
      </>
    ),
  };
  return (
    <svg className="board-bg" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {art[pack]}
    </svg>
  );
}

export type BoardStep = { label: string; glyph: string; done: boolean };

/**
 * The assignment as a journey across the pack's field: each step is a stop, the finish is the
 * pack's goal. Stops are buttons that tick the step; the numbered legend below says the same in text.
 */
export function Board({ pack, steps, title, onToggle, doneLabel }: { pack: Pack; steps: BoardStep[]; title: string; onToggle?: (i: number) => void; doneLabel: string }) {
  const n = steps.length;
  const pos = (i: number) => ({ x: n === 1 ? 40 : 7 + (i * 72) / (n - 1), y: i % 2 ? 68 : 32 });
  const finish = { x: 93, y: 50 };
  const points = [...steps.map((_, i) => pos(i)), finish];
  const reached = steps.findIndex((s) => !s.done); // index of the first open stop, -1 when all done
  return (
    <figure className="studio-figure">
      <div className="board pack-scope" data-pack={pack.id} style={packStyle(pack)}>
        <Backdrop pack={pack.id} />
        <svg className="board-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} vectorEffect="non-scaling-stroke" />
        </svg>
        {steps.map((s, i) => {
          const p = pos(i);
          const label = `${i + 1}. ${s.label}${s.done ? ` · ${doneLabel}` : ""}`;
          return (
            <button
              key={i}
              type="button"
              className="stop"
              data-done={s.done || undefined}
              data-current={i === reached || undefined}
              data-anim="pop"
              style={{ left: `${p.x}%`, top: `${p.y}%`, "--i": i } as CSSProperties}
              onClick={onToggle ? () => onToggle(i) : undefined}
              disabled={!onToggle}
              aria-label={label}
              title={label}
            >
              {s.done ? <Glyph name="check" size={20} /> : <Glyph name={s.glyph} size={20} />}
              <span className="stop-num num" aria-hidden="true">{i + 1}</span>
            </button>
          );
        })}
        <span className="stop stop-finish" data-reached={reached === -1 || undefined} data-anim={reached === -1 ? "cheer" : undefined} style={{ left: `${finish.x}%`, top: `${finish.y}%` }} aria-hidden="true">
          <Glyph name={pack.finish} size={24} />
        </span>
      </div>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  );
}

/** A figure the AI described: timeline, flow or cards. Refs to steps and deadlines show their state. */
export function SceneView({ scene, pack, stepDone, deadlineWhen, doneLabel }: { scene: Scene; pack: Pack; stepDone: (i: number) => boolean; deadlineWhen: (i: number) => string | null; doneLabel: string }) {
  return (
    <figure className="studio-figure scene pack-scope" data-kind={scene.kind} style={packStyle(pack)}>
      <figcaption className="scene-title">{scene.title}</figcaption>
      <ol className="scene-items">
        {scene.items.map((it, i) => {
          const done = it.step !== null && stepDone(it.step);
          const when = it.deadline !== null ? deadlineWhen(it.deadline) : null;
          return (
            <li key={i} className="scene-item" data-done={done || undefined} data-anim="rise" style={{ "--i": i } as CSSProperties}>
              <span className="bubble"><Glyph name={done ? "check" : it.icon} /></span>
              <span className="scene-text">
                <span className="strong">{it.label}</span>
                {it.note && <span className="small muted">{it.note}</span>}
                {when && <span className="pill">{when}</span>}
                {done && <span className="small ok">{doneLabel}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">{scene.alt}</p>
    </figure>
  );
}
