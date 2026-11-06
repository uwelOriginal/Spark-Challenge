# Clara

**Clear instructions. No guessing.** Clara helps autistic and ADHD university students understand each assignment from *all* its sources (the written brief, the rubric, what the professor said in class, announcements). It shows exactly what is asked and where it says so, turns what is unclear into questions for the professor, and gets the student started and reminded.

Built for the North American AI Challenge 2026 (Spark Center for Innovation in Learning) with the Challenge Partner **Surfeando la Neurodiversidad** (Mentoría y Bienestar Estudiantil, Tec de Monterrey). The visual identity follows the partner's palette: Neurosurfer yellow for the student's own things, and source colours taken from the partner's surfer roles.

## What it does (and why not just ChatGPT)

| Clara | Generic chatbot |
|---|---|
| Combines several sources per assignment (Canvas brief, rubric, **class audio or Teams transcript**, announcements) and **flags where they contradict each other** | One chat, one paste |
| **Every fact carries a verbatim quote, checked in code** against the source it claims to come from | Paraphrases. Can't show that a claim is in the document |
| **Asks instead of guessing**: what is missing, vague or contradictory becomes a question and an email draft for the professor | Fills gaps with assumptions ("probably APA, 1–2 pages") |
| Never writes the assignment. Ignores and flags instructions hidden in documents | Wrote the solution code when a brief told it to (eval) |
| One calm path: **upload → work (tasks and chat side by side) → ask the professor or finish**. Saves each assignment with its steps and chat | Chats scroll away |
| **Calendar** (.ics with reminder events), **push reminders** on the installed app, **Canvas calendar feed**, email draft to the professor, **WhatsApp** share to the mentor | Copy and paste |
| **Learns through what the student loves**: tell Clara "fútbol" and the assignment becomes a journey across a pitch, steps get grouped into "pre-match / first half", key concepts get analogies (each with *where it does not match*), and figures (timelines, flows) are drawn for it. The facts and quotes never change | Generic explanations |
| **Clara can change its own settings when asked** ("the text is too small, the animations distract me"): it proposes the change, the student applies or undoes it | Settings are a separate menu |
| Calm, adjustable UI: **dark by default**, light and high-contrast themes, accent colour, Atkinson Hyperlegible or Lexend, text/button size, spacing, workspace layout, Spanish/English with regional variants, motion off / gentle / full (and always off with reduced motion), no account, no diagnosis | General UI |

Latest eval (`eval/results/latest.md`; synthetic briefs, one run, directional): **10/10 test cases pass**. Against the same model used as a chatbot:
- unclear points flagged: **16/19 vs. 9/19**
- invented values: **1 vs. 2**
- briefs where it wrote assignment content: **0 vs. 2**

An earlier run scored 19/19 vs. 13/19. Clara has not yet been measured in a usability study with autistic students.

## Cost: free tier first, paid only when needed

`src/lib/llm.ts` routes every AI call cheapest-first:
1. **Groq free tier** handles text (`gpt-oss-120b`, strict JSON), photos (`qwen3.8-27b`) and class audio (Whisper large v3).
2. **Anthropic** is used only when Groq is rate-limited, errors, or gives an answer that fails Clara's own check (quotes not found word for word).
3. **Read aloud** uses the browser's built-in voice.

A demo costs about **US$0**. See `docs/13_cost_and_routing.md`.

## Run locally

Requires Node.js 22 or newer. `npm test` needs Node 24, which runs TypeScript directly.

```bash
npm install
cp .env.example .env            # GROQ_API_KEY (free) and/or ANTHROPIC_API_KEY; ELEVENLABS_API_KEY optional
npm run build && npm start      # http://localhost:3000   (or npm run dev)
```

| Command | What it does |
|---|---|
| `npm test` | 81 unit tests: quote verification, weekday/date check, relative dates, transcript parsing and speaker filter, calendar building, dialect whitelist, theme checks, long-audio planning |
| `node tests/e2e-flow.mjs <dir>` | End-to-end with real AI in Chrome on a running server (`CLARA_URL`): upload example → tasks → chat → add new material → professor → finish → settings → desktop layout, with screenshots |
| `node tests/e2e-studio.mjs`, `node tests/e2e-reminders.mjs` | Real-AI browser checks of the personal view, and of relative dates, reminders, install and Canvas. They use free-tier quota: do not run them next to `npm run eval` before a demo |
| `node tests/e2e-long-class.mjs <audio> <dir>` | Whole-class audio through the real UI: upload → job → passages → decode (needs `GROQ_API_KEY`) |
| `docker build -t clara . && docker run -p 3000:3000 -e GROQ_API_KEY=… clara` | Container for hosts that support long jobs (Vercel cannot run the whole-class audio jobs) |
| `npm run eval` | 10 test cases + **Clara vs. generic chatbot** (blind judge). Writes `eval/results/latest.md` |

## Architecture

```
Phone / browser (PWA, local-first)
  localStorage: assignments, sources, chats, settings   ← nothing about the student is stored on the server
  │
  ├─ /api/extract     PDF text (unpdf, no AI) | photo or scanned PDF → AI transcription
  ├─ /api/transcribe  class audio → Groq Whisper (free) + speakers estimated from content
  │                   (or ElevenLabs Scribe acoustic diarization, if a key is set) → segments
  │                   the student keeps only the professor's voice before anything reaches the model
  ├─ /api/audio-jobs  whole-class recordings (hours): streamed upload → background job:
  │                   ffmpeg 10-min parts → parallel Whisper (rate limits waited out) → merge →
  │                   coursework passages extracted and verified → student reviews (GET /api/audio-jobs/:id)
  ├─ /api/decode      several sources → structured output (zod) → every quote checked against its source,
  │                   weekday/date consistency checked in code
  ├─ /api/chat        facts only from the sources (citations checked); explanations through the student's
  │                   interest; optional figure; optional settings proposal (whitelisted, student confirms)
  ├─ /api/theme       the interest layer: themed step names, groups, analogies, figures, made from the
  │                   checked decode, rejected in code if it loses a step or invents a date/time/weight
  ├─ /api/changes     before/after → what changed, what to do, what stays the same
  ├─ /api/canvas      the student's Canvas calendar feed → upcoming assignments (private addresses refused)
  ├─ /api/calendar    returns a calendar file as text/calendar, so iPhones open their "add" sheet (nothing stored)
  ├─ /api/push        reminder queue: push address, opaque ids and times only; texts stay on the phone
  └─ /api/health      which optional features are configured
Calendar building, email draft, WhatsApp share: built in the browser (no OAuth)
```

Diagrams: [`../docs/diagrams/`](../docs/diagrams/README.md). UI flow, settings system and what was cut in v3: [`../docs/14_simplification.md`](../docs/14_simplification.md). Current state: [`../docs/16_current_state.md`](../docs/16_current_state.md).

- `src/lib/actions.ts` holds every AI flow the UI runs (create, add material, ask); components only render.
- `src/lib/llm.ts` is the only file that talks to the model. `src/lib/stt.ts` is the only file that talks to the speech-to-text vendor.
- Personalization (docs/15): `src/lib/personal.ts` (packs, checks, settings whitelist), `src/components/studio/` (glyphs, boards, figures). The AI only returns data; pictures come from a fixed list, so it never writes markup.
- Prompts are versioned in `src/prompts/index.ts`, which is the source for the "PDF of AI prompts" deliverable.
- Protection for a public URL: optional access code, per-IP rate limit, size limits (`src/lib/guard.ts`).

## Deploy

The repo has a `Dockerfile` and `railway.json`. Use a container host: class-audio jobs and large uploads do not fit serverless limits. Root directory `clara`, health check `/api/health`. Set `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `CLARA_ACCESS_CODE`, and for reminders `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and optionally `CLARA_DATA_DIR` on a volume. After deploying, test a real AI call on a phone.

## Privacy and responsible AI
- No account and no server database. Clara never asks for a diagnosis. "Delete all my data" wipes the device. Sources do pass through the AI providers during a request.
- Class audio: the student records only with the professor's permission. Other voices are discarded before the model sees anything, and audio is not stored by Clara.
- Text inside sources is treated as data. Injected instructions are ignored and flagged.
- Nothing is sent or shared automatically: email, WhatsApp and calendar are always the student's own action.
- In distress, the chat answers calmly and points to the student's surfer, mentor or the Línea TQueremos. It gives no clinical advice.

## Status
Prototype (Nov 2026). The sample material in `src/samples/briefs.json` is **synthetic**. Replace it with real anonymized material from the partner. AI assistance and third-party code are disclosed in [`ATTRIBUTION.md`](ATTRIBUTION.md).
