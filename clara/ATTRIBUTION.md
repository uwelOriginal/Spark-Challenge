# Attribution and AI-assistance disclosure

The challenge rules require a "human in the loop" who can review, explain, and validate all submitted code. This file records where code and content came from. Keep it updated on every change.

## AI assistance
- **Proof of concept (Oct 27, 2026):** the initial scaffold, route handlers, UI component, quote verifier, eval harness, and demo-recording script were drafted with **Claude Code (Anthropic)** under the team's direction. The team owns the design decisions: the scope (Clara Lite), the "ask, don't guess" principle, no stored data, and no diagnosis.
- **Before submission, each module must have a named team owner** who has reviewed it, can explain it line by line, and has made their own changes:

| Module | Owner | Reviewed | Notes |
|---|---|---|---|
| `src/lib/llm.ts`, `src/lib/groq.ts` (model router: free tier first, escalation) | | ☐ | |
| `src/lib/verify.ts` + `tests/` (quote verification) | | ☐ | |
| `src/lib/guard.ts` (limits, access code) | | ☐ | |
| `src/app/api/*` (routes) | | ☐ | |
| `src/components/ClaraApp.tsx` (shell, navigation) | | ☐ | |
| `src/components/Screens.tsx` (Today, list, new, settings) | | ☐ | |
| `src/components/AssignmentView.tsx` (8 tabs) | | ☐ | |
| `src/components/SourceBuilder.tsx` (paste, PDF/photo, audio, transcript, Canvas) | | ☐ | |
| `src/lib/stt.ts`, `src/lib/transcript.ts` (class audio, speaker filter) | | ☐ | |
| `src/lib/jobs.ts`, `src/lib/longaudio.ts`, `src/app/api/audio-jobs/*` (whole-class orchestrator) | | ☐ | |
| `src/lib/ics.ts`, `src/lib/calendar.ts` (calendar export, Canvas feed) | | ☐ | |
| `src/lib/store.ts` (local-first storage) | | ☐ | |
| `src/prompts/index.ts` (prompts) | | ☐ | |
| `src/lib/i18n.ts`, `src/lib/templates.ts` (wording) | | ☐ | |
| `eval/` (benchmark, video) | | ☐ | |

## Third-party software
| Package | Use | License |
|---|---|---|
| Next.js, React | Web framework | MIT |
| @anthropic-ai/sdk | Model API client | MIT |
| zod | Output schemas | MIT |
| unpdf (PDF.js) | PDF text extraction | MIT / Apache-2.0 |
| playwright-core | UI test and demo recording | Apache-2.0 |
| ffmpeg-static (FFmpeg binary) | Splitting long class recordings into parts (run as a separate process) | Package MIT; the FFmpeg binary is GPL-licensed |
| Atkinson Hyperlegible (Braille Institute), Fira Sans (Mozilla) | Fonts, self-hosted via next/font | SIL Open Font License |

## Services
- Groq API (free tier, used first): text (`openai/gpt-oss-120b`), vision (`qwen/qwen3.8-27b`), speech-to-text (Whisper large v3).
- Anthropic API (Claude): escalation for decoding, chat and change comparison, and transcription of scanned PDFs.
- ElevenLabs Scribe (optional, off by default): class-audio transcription with acoustic speaker separation.
- Browser Web Speech API: read aloud, on the device.

## Design
- Colours taken from the Challenge Partner's own presentation (Surfeando la Neurodiversidad, Tec de Monterrey). We use colours only, never their logo.
- Layout follows the taste-skill "editorial greeting" app style (seed 90748089).

## Content
- The sample briefs in `src/samples/briefs.json` are synthetic and were written for testing. They aren't real course material.
- Partner research belongs to Surfeando la Neurodiversidad (Tec de Monterrey) and is used with their permission. Quotes are anonymized.
