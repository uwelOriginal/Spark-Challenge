# 15 · Interest-based personalization and the visual Studio (brainstorm)

Status: **built (steps 1–5)**, 2026-11-04. Step 6 (Hyperframes export) not started.

## What was built

| Piece | Where |
|---|---|
| Profile settings: interest (free text), picture pack (auto-guessed or chosen), depth `off / light / full`, motion `off / calm / full`; first-visit "What do you like?" card | `lib/store.ts`, `components/Settings.tsx`, `studio/Studio.tsx` `InterestCard` |
| 9 packs (football, basketball, music, video games, space, trains, animals, art, generic), 49 outline glyphs, one field/court/stage backdrop per pack, colours from one hue per pack adapted to dark / light / contrast | `lib/personal.ts`, `lib/glyphs.ts`, `studio/Glyph.tsx`, `studio/Scene.tsx` |
| Board: the steps as stops on a journey across the pack's field, ticking a stop ticks the step; score tokens | `studio/Scene.tsx` `Board`, `Studio.tsx` `StudioHero` |
| `/api/theme` (`theme-v1.0`): themed step names, 2–4 groups, analogies with `where_it_breaks`, 1–3 figures (timeline / flow / cards). Built from the checked decode, not the raw sources. Escalated to the next model when it loses or repeats a step, breaks a reference, skips the limits of an analogy, or writes a date / time / year / % not in the decode; then repaired by `sanitizeTheme` | `app/api/theme/route.ts`, `lib/personal.ts` |
| Chat (`chat-v2.0`): facts stay literal and cited; explanations use the interest, labelled ("En términos de fútbol:"); optional figure; `settings_change` proposal → card with Apply / No / Undo; only display and personalization keys reachable (`changeToPatch`) | `prompts/index.ts`, `app/api/chat/route.ts`, `Studio.tsx` `ChangeCard` |
| Literal rule now applies to extraction prompts only (decode, changes, speakers, class-extract, transcribe) | `prompts/index.ts` header |
| Motion: only `[data-anim]` Studio elements move; nothing moves with `prefers-reduced-motion` | `globals.css` Studio section |

Verification: 46/46 unit tests (`tests/personal.test.ts`, Groq strict-schema test covers the new schemas); `next build` clean; `tests/e2e-studio.mjs` 15/15 with real AI (theme generated, every step grouped, 3 analogies with limits, 2 figures, chat explained "análisis crítico" with football, settings proposal applied and undone, 0 page errors). Not yet tested with students.

No new npm dependencies were needed: glyphs and boards are hand-drawn SVG, animation is CSS.

### Fixes after first user test (2026-11-04)

- **Changing the theme did not change the analogies.** Cause: the prompt themed around the interest *text*; the chosen pack was only a picture hint. Now a chosen pack is the theme (prompt says so), choosing a pack in Settings also renames the interest, and a pack proposed in the chat does the same (`changeToPatch`).
- **"Rehacer" did nothing.** Cause: the hook skipped generation whenever the saved theme's key matched. It now forces a new generation.
- **Background pictures** (`studio/Decor.tsx`): faint, static theme pictures fixed behind the page, a large theme motif in the corner, and a watermark in the corner of the task and chat panels. On by default with an interest; "Quitar fondo" in the Studio or Settings → Dibujos de fondo removes them.
- Chat `chat-v2.1`: asking to be taught through another interest always comes with a settings proposal.
- e2e `tests/e2e-studio.mjs`: 21/21 with real AI (adds theme switch, Rehacer, background on/off).

## 1. The idea

A student tells Clara what they love (football, trains, Minecraft, K-pop...). Clara then:

1. explains concepts of the assignment through that interest (labelled analogies),
2. groups and shows the steps in that interest's language (e.g. football: "pre-match / first half / second half", deadlines as fixtures, progress as a league table),
3. puts visuals around the page: small figures and short animations made for this assignment,
4. can change the personalization and app settings itself when the student asks ("make it calmer", "switch to F1"), always with a confirm step.

## 2. Why it can work, and where it can hurt

**Evidence for.** Using autistic people's intense interests raises engagement and learning in most studies reviewed (Gunn & Delafield-Butt 2016, *Review of Educational Research*). Monotropism theory (Murray, Lesser & Lawson 2005) explains why: attention flows well into an active interest and poorly elsewhere, so the interest becomes the way in.

**Gaps.** Most of that evidence comes from children in school. There is little on university students. The partner (Surfeando) should test it with real students before we claim it in the pitch. Check every citation before it goes into a deliverable.

**Risks we must design around.**

| Risk | Design answer |
|---|---|
| Clara's core rule is "literal, no metaphors". Analogies break it. | Two layers. The **literal layer** (summary, quotes, deadlines, ambiguities) never changes. The **interest layer** shows in its own labelled panel ("In football terms"), and the student can turn it off. |
| An analogy distorts the concept ("a thesis is like a goal" is wrong in some way) | Every analogy carries `where_it_breaks`: one sentence on what does not match. Shown under the analogy. |
| Feels childish or instrumental ("they used my interest to make me do homework") | Opt-in, and the student sets the depth: *just icons*, *some analogies*, *full theme*. Adult tone. No mascots by default. |
| Sensory overload from animation | Setting `motion: off / calm / full`; follow `prefers-reduced-motion`; nothing flashes; animations play once, on demand. |
| Unexpected changes are distressing | The agent proposes setting changes as a diff the student accepts; one-tap undo. |
| Interest text is user input sent to the model | Fence it like sources; cap length; it describes taste, never instructions. |

## 3. Studio: Hyperframes or not?

**What Hyperframes is.** An HTML + GSAP composition format rendered to MP4 by a CLI (`npx hyperframes`, headless Chrome + ffmpeg). The `/brag` plugin installed here uses it for launch videos.

**Verdict: not for the live app (yet).**

- Rendering is server-side and takes tens of seconds per clip. Clara's work view needs visuals in under 2 s.
- Video is not interactive, not accessible to screen readers, not re-themable when the student switches dark/light or font size.
- The model would author HTML/JS. Letting an LLM output executable markup into the page is an injection and XSS risk (sources can contain hostile text).

**Recommended instead: a declarative scene spec, rendered in the browser.**

The model returns JSON, validated by zod (same pattern as `decode`, `chat`). A React `<Scene>` component draws it with SVG + CSS animations. The model never writes code.

```ts
// sketch
type Scene = {
  id: string;
  kind: "timeline" | "flow" | "compare" | "map" | "board" | "counter";
  title: string;
  alt: string;                       // screen-reader description, required
  pack: string;                      // "football", "trains", "generic"...
  items: { label: string; icon: string; note?: string; ref?: { step?: number; deadline?: number } }[];
  motion: "none" | "enter" | "sequence";
};
```

- **Theme packs** (curated by us, not generated): background art, icon set and vocabulary per interest. Football pack: pitch board, ball, whistle, scoreboard, fixtures list. Start with 6–8 packs plus a `generic` pack; unknown interests use `generic` icons + interest vocabulary only.
- **Icons:** bundled set (e.g. `lucide-react`, ISC licence) plus pack SVGs. The model picks icon names from an allow-list, so nothing breaks.
- **Animation:** CSS / Web Animations (no new dependency) or `motion` if we want sequencing. Lottie packs (`@lottiefiles/dotlottie-react`) are an option for richer pre-made loops, with licence checks.
- **Hyperframes later, as an export:** the same `Scene[]` can be turned into a Hyperframes composition offline to make a 30-second "your assignment as a match recap" video for review or the demo. Optional, not on the critical path.
- **AI image generation:** skip. Not in our stack (Groq/Anthropic don't generate images), inconsistent style, extra cost and a new data processor for privacy.

## 4. Data model (local-first, same as today)

```ts
// store.ts, Settings
profile: {
  interests: { label: string; pack: string }[];   // max 3
  depth: "off" | "icons" | "analogies" | "full";
  motion: "off" | "calm" | "full";
  avoid: string[];                                 // topics or words the student dislikes
};

// Assignment
themed?: {
  pack: string;
  groups: { label: string; steps: string[] }[];    // step actions, like `done`
  analogies: { concept: string; analogy: string; where_it_breaks: string }[];
  scenes: Scene[];
  promptVersion: string;
};
```

`themed` is cached per assignment and regenerated only when the decode, the interest or the depth changes. Deadlines and step order are never changed by the theme: groups only label them.

## 5. AI flow

- **New route `/api/theme`** (`theme-v1.0` prompt): input = decoded result + profile (fenced). Output = `themed`. Runs after `decode`, in parallel with the student reading the literal view. One call per assignment, Groq first, Anthropic on escalation (doc 13).
- **Quality check in `verify.ts`:** every `steps[]` action exists in the decode; every `ref` points at a real step or deadline; icon names in the allow-list; no dates or numbers in analogies that differ from the decode.
- **Chat:** `CHAT_SYSTEM` gets the profile, so it may add an "in football terms" line after the literal answer, marked as analogy, when depth ≥ `analogies`.

## 6. Agent that changes settings

Add an optional `proposed_changes` field to `ChatSchema`:

```ts
proposed_changes: {
  settings?: Partial<Pick<Settings, "theme" | "accent" | "font" | "textSize" | "spacing" | "layout" | "voiceRate">>;
  profile?: Partial<Settings["profile"]>;
  regroup?: boolean;            // regenerate `themed`
  reason: string;               // one literal sentence
} | null
```

- Whitelisted keys only (zod). Name, reminders and data deletion are never agent-editable.
- UI shows a card: "Clara suggests: theme dark → light, motion full → calm. [Apply] [No]". Apply calls `setSettings`; keep the previous settings for one-tap undo.
- Structured field instead of native tool calling: works the same on both providers in the router and fits the current `routeStructured` design.

## 7. Build order

1. Profile settings UI + `depth/motion` settings (no AI). Half a day.
2. `<Scene>` renderer + `generic` and `football` packs, fed by hand-written JSON. Validate the look with 2–3 students. 1–2 days.
3. `/api/theme` + verify + cache. 1 day.
4. `proposed_changes` in chat + confirm card + undo. Half a day.
5. Eval cases: quotes and deadlines unchanged with theme on; injection inside the interest field; analogy accuracy (`where_it_breaks` present). Half a day.
6. Optional: Hyperframes recap export for the demo video.

## 8. Tools and skills

| Need | Have it? |
|---|---|
| UI design of packs and scenes | Yes: `frontend-design`, `taste-skill`, `artifact-diagramming` (SVG) |
| Model / prompt work | Yes: `claude-api` skill, existing router |
| Hyperframes (only for step 6) | `/brag` plugin installed; would also need `npx hyperframes doctor` + `npx hyperframes skills` |
| Consistent new theme packs | **Worth creating:** a project skill `clara-theme-pack` (via `skill-creator`) holding the pack format, icon allow-list, tone rules and a check script, so new packs stay uniform |
| Stress-testing the concept | `court` skill, before pitching it to the partner |
| npm | `lucide-react`; optional `motion`, `@lottiefiles/dotlottie-react` |
