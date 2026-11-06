# 12: v2 Product Decisions (Oct 27, night): from "Lite demo" to a complete-feeling app

**Trigger:** the user tested v1 and found it visually unappealing (no partner brand). It also didn't show enough value over ChatGPT: no class audio or document upload, no history, no notifications, no integrations, and it wasn't mobile-first.

## 1. Tension with the court verdict (stated honestly)
The court convicted the *13-feature, one-week* plan for being too big and unexplainable. v2 grows the scope again, so here is how the risk is controlled:
- **Every feature is thin and has no server state.** There is no DB and no auth. Integrations use open formats (.ics, mailto, wa.me, the Canvas calendar feed URL) instead of OAuth.
- **Everything is tested.** 18 unit tests, a real-AI end-to-end flow in Chrome (8/8), and the eval (10/10).
- **Feature freeze still applies on Mon Nov 2.** A retrial (`--quick`) runs after the partner meeting with this version and the partner's evidence.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| **Value vs. ChatGPT** | Several sources per assignment, cross-source contradiction detection, code-verified quotes, ask-don't-guess, saved assignments with chat history | It's measurable. Eval: unclear points flagged 19/19 vs. 13/19, invented values 0 vs. 5, wrote the assignment 0 vs. 2 |
| **Class voice** | Record or upload audio → ElevenLabs Scribe v2 (diarization, word timestamps) → **the student keeps only the professor's voice** → it becomes a "said in class" source. Teams/Zoom `.vtt` transcripts follow the same path with no vendor | Gives the NotebookLM-like capability through an API, with the privacy filter built in. See doc 10 |
| **Documents** | PDF (local text extraction), photo or scanned PDF (AI transcription, then the student reviews it), paste | Covers how briefs actually arrive |
| **History** | Local-first (`localStorage`): assignments, sources, chats, changes, settings | No account means the simplest possible privacy story. Cross-device sync is roadmap |
| **Calendar** | A `.ics` file with due dates, reminder events (N days before, at the student's chosen time) and a first-step block, plus Google Calendar links | Works with Google, Apple and Outlook with no OAuth. Separate reminder events notify even in calendars that ignore VALARM |
| **Notifications** | **Channel = the phone's own calendar notifications**, plus the in-app Today view | Reliable, predictable, and controlled by the student. True push or WhatsApp needs a backend (subscriptions, scheduler, DB) → roadmap |
| **Canvas** | Import from the Canvas **calendar feed URL** (Calendar → Calendar Feed). No API token or login | Tec uses Canvas. A real integration that's feasible in a day |
| **Mentor** | An editable summary shared through **WhatsApp** (`wa.me` link) or copy | WhatsApp is the dominant channel in Mexico. The student stays in control |
| **Professor** | The editable message opens in the student's **email app** (`mailto`) | One tap, and nothing is sent automatically |
| **Mobile-first / PWA** | Bottom bar on phones, sidebar on desktop, installable (manifest + service worker) | The user asked for it explicitly. Students live on their phones |
| **Brand** | The partner's palette mapped to meaning: yellow = the student's own things (next step), blue = instructions, green = rubric (academic surfer), teal = said in class (social surfer), magenta = announcements and contradictions (mentor). Red only for actual failures. Fonts: Atkinson Hyperlegible (body), Fira Sans (titles). Mark: Neurosurfer yellow circle with a wave | From the partner's own slides (Canva kickoff deck). Taste-skill app style "editorial greeting", seed 90748089 |

## 3. Verified (Oct 27, night)
- `npm test`: 18/18.
- E2E with real AI (`tests/e2e-flow.mjs`), 8/8 steps, no page errors:
  - example decoded with 20/20 quotes verified
  - brief-vs-class contradiction shown
  - chat answers "1,500 words" citing the class transcript
  - 10 calendar events planned
  - change translator finds the moved date
  - Canvas demo lists 3 assignments
  - no horizontal overflow
- Eval: 10/10, including the new TC10 (brief + class transcript: contradiction flagged, 5 class facts verified, "1,500 words" taken from class).
- Taste-skill: lint has 0 FAIL. Inspector (app rules, 1440/768/390) has 0 FAIL. The two first-run-state warnings were addressed by adding the "what Clara does differently" panel.
- Video: `clara/demo/clara-demo-es.webm`, 2:42, real outputs, Spanish captions.

## 4. Not verified / open
- **Audio transcription has not been tested end to end**: it needs an `ELEVENLABS_API_KEY` (free tier). Without it, the app shows a clear message and offers the transcript upload instead. Classroom audio quality still needs the bake-off from doc 10.
- **A real Tec Canvas feed is untested.** We only tested a synthetic feed in the same format.
- On desktop, the Today screen's two columns end at different heights (cosmetic).
- Push and WhatsApp notifications, cross-device sync, and an LMS (LTI) integration are roadmap.
