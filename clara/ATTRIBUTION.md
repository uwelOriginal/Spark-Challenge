# Attribution and AI-assistance disclosure

The challenge rules require a "human in the loop" who can review, explain and validate all submitted code. This file records where code and content came from. Keep it updated on every change.

## AI assistance

**Claude Code (Anthropic) wrote most of the first drafts in this repository under the team's direction:** application code, tests, the benchmark, documentation, diagrams, and the scripts in `submission/`. An internal concept review was also run by AI agents; its verdict is in `docs/court/` and the full transcript is kept privately by the team. Comments were later shortened with the same tool, at the team's request, without changing behaviour.

The team set the direction and made the product decisions, including:
- the partner, the user and the scope;
- rejecting v1 after trying it ("not better than ChatGPT"), which led to multi-source input and class audio;
- rejecting v2 as too complex and overstimulating, which led to the one-path v3;
- choosing interest-based explanations and where analogies are allowed;
- cheapest-first routing and the deployment choices.

These decisions are logged in `docs/07_execution_plan.md`, `docs/12`, `docs/13`, `docs/14` and `docs/15`.

### Human review by module

Each owner must read the module, be able to explain it, and record the date. **Only the person who did the review fills in the date.**

Reviews took place during development, as each module was built, but were not logged at the time. This table was filled in afterwards, on Nov 6, from each owner's own account of when they did the review. Approximate dates are marked "approx." An empty date means the owner has not recorded one yet.

| Module | Owner | Reviewed on |
|---|---|---|
| `src/lib/llm.ts`, `src/lib/groq.ts` (model router) | Hugo | |
| `src/lib/verify.ts`, `tests/verify.test.ts` (quote checks) | Hugo | |
| `src/prompts/index.ts`, `src/lib/schemas.ts` (prompts, output contract) | Arturo | |
| `src/lib/guard.ts` (access code, limits, fencing) | Hugo | |
| `src/app/api/*` (routes) | Hugo | |
| `src/lib/stt.ts`, `src/lib/transcript.ts`, `src/lib/jobs.ts`, `src/lib/longaudio.ts` (class audio) | Francisco | |
| `src/lib/pushServer.ts`, `src/lib/notify.ts`, `public/sw.js` (reminders) | Hugo | |
| `src/lib/ics.ts`, `src/lib/calendar.ts`, `src/lib/dates.ts` (calendar, dates) | Hugo | |
| `src/lib/store.ts`, `src/lib/actions.ts` (storage, AI flows) | Arturo | |
| `src/lib/personal.ts`, `src/lib/glyphs.ts`, `src/components/studio/*` (personalization) | Hugo | |
| `src/components/*` (UI), `src/app/globals.css` | Arturo | |
| `src/lib/i18n.ts`, `src/lib/templates.ts`, `src/lib/dialects.ts` (wording) | Francisco | |
| `eval/`, `tests/` | Hugo | |

## Third-party software

| Package | Use | License |
|---|---|---|
| Next.js, React | Web framework | MIT |
| @anthropic-ai/sdk | Model API client | MIT |
| zod | Output schemas | MIT |
| unpdf (PDF.js) | PDF text extraction | MIT / Apache-2.0 |
| web-push | Sending push reminders | MPL-2.0 |
| playwright-core | Browser tests, diagram rendering | Apache-2.0 |
| ffmpeg-static (FFmpeg binary) | Splitting long class recordings, run as a separate process | Package GPL-3.0-or-later; FFmpeg binary GPL. Verify the license before any commercial distribution |
| Atkinson Hyperlegible (Braille Institute), Lexend, Fira Sans (Mozilla) | Fonts, self-hosted via next/font | SIL Open Font License |
| Mermaid (loaded from jsDelivr by `docs/diagrams/render.mjs`) | Diagram rendering | MIT |

## Services

- **Groq API** (free tier, used first): text (`openai/gpt-oss-120b`), vision (`qwen/qwen3.8-27b`), speech to text (Whisper large v3).
- **Anthropic API** (Claude): escalation for structured answers, and reading scanned PDFs.
- **ElevenLabs Scribe** (optional, off by default): class-audio transcription with speaker separation.
- **Browser Web Speech API**: read aloud, on the device. **Browser push services**: reminder delivery.

## Design

- Colours are taken from the Challenge Partner's own presentation (Surfeando la Neurodiversidad, Tec de Monterrey). We use colours only, never their logo.
- Layout started from the "editorial greeting" app style of taste-skill, a design guidance tool for Claude Code, then was reworked for v3.

## Demo videos

`demo/*.mp4` are git-ignored because of size. They show real screen recordings of the app with real AI output, composed with git-ignored scripts in `brag-output/`. Sound effects come from earshot (MIT, github.com/Leonxlnx/earshot). The class in the video is fictional, with spoken lines made using Windows system voices.

## Content

- The sample material in `src/samples/briefs.json` and `public/samples/canvas-demo.ics` is synthetic, written for testing. It is not real course material.
- Public partner facts come from Conecta Tec and the Tec kickoff deck, cited in `docs/02_partner_surfeando.md`.
- Research citations are listed in `docs/03_research_evidence.md`.
- The pitch deck uses the organizers' required template. The Business Model Canvas uses their required canvas. Those two templates belong to the Spark Center.
