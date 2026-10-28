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
| Saves each assignment with its chat history, steps, changes and mentor summary. Today view shows the next step | Chats scroll away |
| **Calendar** (.ics with reminder events + Google Calendar links), **Canvas** calendar feed import, email draft, **WhatsApp** share to the mentor | Copy and paste |
| Installable, mobile-first, calm UI (Atkinson Hyperlegible, no motion), Spanish/English, no account, no diagnosis | General UI |

Latest eval (`eval/results/latest.md`; synthetic briefs, directional): **10/10 test cases pass**. Against the same model used as a chatbot:
- unclear points flagged: **19/19 vs. 13/19**
- invented values: **0 vs. 5**
- briefs where it wrote assignment content: **0 vs. 2**

## Cost: free tier first, paid only when needed

`src/lib/llm.ts` routes every AI call cheapest-first:
1. **Groq free tier** handles text (`gpt-oss-120b`, strict JSON), photos (`qwen3.8-27b`) and class audio (Whisper large v3).
2. **Anthropic** is used only when Groq is rate-limited, errors, or gives an answer that fails Clara's own check (quotes not found word for word).
3. **Read aloud** uses the browser's built-in voice.

A demo costs about **US$0**. See `docs/13_cost_and_routing.md`.

## Run locally

```bash
npm install
cp .env.example .env            # GROQ_API_KEY (free) and/or ANTHROPIC_API_KEY; ELEVENLABS_API_KEY optional
npm run build && npm start      # http://localhost:3000   (or npm run dev)
```

| Command | What it does |
|---|---|
| `npm test` | 18 unit tests: quote verification, weekday/date check, transcript parsing and speaker filter, Canvas feed parsing, calendar building |
| `node tests/e2e-flow.mjs <dir>` | End-to-end with real AI in Chrome on a running server (`CLARA_URL`): example → decode → every tab → chat → new version → calendar → Canvas demo, with screenshots |
| `node tests/e2e-long-class.mjs <audio> <dir>` | Whole-class audio through the real UI: upload → job → passages → decode (needs `GROQ_API_KEY`) |
| `docker build -t clara . && docker run -p 3000:3000 -e GROQ_API_KEY=… clara` | Container for hosts that support long jobs (Vercel cannot run the whole-class audio jobs) |
| `npm run eval` | 10 test cases + **Clara vs. generic chatbot** (blind judge). Writes `eval/results/latest.md` |
| `npm run video` | Records the Spanish demo video with real AI to `demo/clara-demo-es.webm` |

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
  ├─ /api/chat        questions answered only from the sources, citations checked
  ├─ /api/changes     before/after → what changed, what to do, what stays the same
  ├─ /api/canvas      Canvas calendar feed (.ics URL, no login) → upcoming assignments
  └─ /api/health      which optional features are configured
Calendar export, email draft, WhatsApp share: built in the browser (no server, no OAuth)
```

- `src/lib/llm.ts` is the only file that talks to the model. `src/lib/stt.ts` is the only file that talks to the speech-to-text vendor.
- Prompts are versioned in `src/prompts/index.ts`, which is the source for the "PDF of AI prompts" deliverable.
- Protection for a public URL: optional access code, per-IP rate limit, size limits (`src/lib/guard.ts`).

## Privacy and responsible AI
- No account and no server database. Clara never asks for a diagnosis. "Delete all my data" wipes the device.
- Class audio: the student records only with the professor's permission. Other voices are discarded before the model sees anything, and audio is not stored by Clara.
- Text inside sources is treated as data. Injected instructions are ignored and flagged.
- Nothing is sent or shared automatically: email, WhatsApp and calendar are always the student's own action.
- In distress, the chat answers calmly and points to the student's surfer, mentor or the Línea TQueremos. It gives no clinical advice.

## Status
Prototype (Oct 2026). The sample material in `src/samples/briefs.json` and `public/samples/canvas-demo.ics` is **synthetic**. Replace it with real anonymized material from the partner. See `ATTRIBUTION.md`.
