# 07: Execution Plan (Oct 27 → Nov 7)

**Today is Tue Oct 27 (D0). Internal submission target: Thu Nov 5, 12:00 MT. Monterrey pitch: Sat Nov 7, 8:00–12:00.**

## ▶ Revised plan (after the court verdict and the scope change to Clara Lite; this supersedes the day table below)

| Day | Date | Must happen | Owner | Status |
|---|---|---|---|---|
| D0 | Tue Oct 27 | Court verdict, decision on Clara Lite, POC built (`clara/`), tests, eval and video scripts, meeting kit | Ops + Claude | ✅ POC built; ⏳ needs API key |
| D1 | **Wed Oct 28** | ~~Key, eval, video~~ ✅ done Oct 27 night (8/8 pass; video 1:50). **Team: watch the video, try the app, read `11_code_walkthrough.md`, rehearse the meeting** | Team | ⏳ |
| D2 | **Thu Oct 29** | **Partner meeting** (`09_partner_meeting_kit.md`): discovery first, then demo, then the asks (real briefs + Clara-vs-ChatGPT test) | Research lead | ⏳ |
| D2 | Thu Oct 29 (evening) | Synthesize the evidence. Write "the research changed our solution by…". **Decide on a retrial** (with real evidence) | Ops | |
| D3 | Fri Oct 30 | Apply the partner feedback. Add real briefs to the golden set. Re-run the eval. **The submission form opens.** | Eng | |
| D4–D5 | Sat Oct 31 – Sun Nov 1 | Clara-vs-ChatGPT sessions (3–6 people). Deploy to Vercel with an access code. Team code debriefs (each member owns a module) | All | |
| D6 | Mon Nov 2 | **Feature freeze.** Final eval. BMC v2 (in the official template) | All | |
| D7–D8 | Tue Nov 3 – Wed Nov 4 | Code freeze. README/ATTRIBUTION/prompts PDF. Deck in the official template + demo video on slide 4. Written responses. 3 timed rehearsals (slides auto-advance) plus Q&A prep | All | |
| D9 | Thu Nov 5 | **Submit by 12:00 MT** | Ops | |

**On the retrial:** it's deferred until after Thursday, because 2 of the 3 conditions for acquittal (real briefs; Clara vs. ChatGPT with Neurosurfers) depend on the partner. Running it now would re-hear the same "not validated" charge. After the meeting we run `--quick` (6 jurors) with real evidence.

## Roles (map these to real people, 3–5 members)

| Role | Owns | Can be combined with |
|---|---|---|
| **Ops / PM** | Plan, scope veto, deadlines, progress-report reminders, written responses, partner contact log | Pitch lead |
| **AI engineer** | `/prompts`, decode, plan, and diff pipeline, structured outputs, golden-set evals, prompts PDF | Backend |
| **Frontend / UX engineer** | Calm UI, onboarding, Now view, i18n, deploy | - |
| **Research & partner lead** | Interviews, usability tests, evidence log, consent, partner review of claims | Biz |
| **Business & pitch** | BMC, deck in the official template, demo video, rehearsals | Ops |

**Code-authenticity rule:** every merged PR has a human author or reviewer who can explain it. AI-assisted code is noted in `ATTRIBUTION.md`.

## Day-by-day

| Day | Date | Product / Eng | Research / Partner | Biz / Pitch / Ops | Exit criterion |
|---|---|---|---|---|---|
| D0 | **Tue Oct 27** | Repo (public, `.env` ignored, secret scan), stack chosen, `/prompts/decode.md` v0 | **Message the partner today** and book a coordinator + 2–4 surfers for Wed/Thu. Ask for anonymized briefs. | Concept lock (court + team). Assign roles. AM/PM report reminders. | Idea locked, interviews requested |
| D1 | Wed Oct 28 | Decoder v1 (structured output + quotes), input (text/PDF/image) | **Interviews #1** (coordinator, surfers). Collect briefs. | Evidence log started | Decoder runs on 3 real briefs |
| D2 | Thu Oct 29 | Planner v1, Now view skeleton, **deployed to prod URL** | Interviews #2. Synthesize H1–H7. | Write the golden set (expected outputs) | **Eval run #1** (kill criterion: >2/10 wrong dates or deliverables → narrow scope) |
| D3 | Fri Oct 30 | Adaptation loop, profile panel, onboarding, ES/EN | Recruit usability participants | BMC v1 | **All P0 working end to end in prod** |
| D4 | Sat Oct 31 | Fix bugs from testing, F10 Change Translator | **Usability round 1** (3–5 people) | Draft deck story (5 slides) | Round 1 synthesized |
| D5 | Sun Nov 1 | F11 Surfer Bridge, F12 .ics, F13 reminders | Send findings back to the partner | Draft written responses | P1 done |
| D6 | Mon Nov 2 | Polish, a11y pass (contrast, keyboard, screen reader basics) | **Usability round 2** | **Eval run #2** (target ≥10/12) | **FEATURE FREEZE (EOD)** |
| D7 | Tue Nov 3 | **CODE FREEZE** (bug fixes only). README, ATTRIBUTION, architecture doc | Partner reviews quotes and claims | Prompts PDF, final BMC, record backup demo video | Repo submission-ready |
| D8 | Wed Nov 4 | Smoke test prod, set API spend cap | - | Deck in the official template, **3 timed rehearsals** (≤4:45), finish written responses | Everything drafted |
| D9 | **Thu Nov 5** | Final smoke test | - | **SUBMIT by 12:00 MT.** Then don't touch the deck. | Submitted |
| - | Fri Nov 6 | Keep prod up. Monitor. | - | Rehearse, travel | - |
| - | **Sat Nov 7** | - | - | **Monterrey Launchpad** (≥2 members) | Pitch |

**Every day, every person:** AM and PM progress reports (Airtable form). Missing one is grounds for disqualification. Hold a 15-minute standup at a fixed time.

## Deliverables checklist

Current status and blockers: [`../submission/README.md`](../submission/README.md).

- [ ] 1 · Pitch deck: built in the official template; needs names, partner finding, logo and video
- [ ] 2 · MVP at a public URL with access for judges: confirm with a phone test
- [ ] 3 · Business Model Canvas: built; needs the team name
- [ ] 4 · Public GitHub: README and ATTRIBUTION done, no secrets found; **repo must be made public; module reviews and teammates' commits pending**; clarify the "custom script URL" item
- [x] 5 · PDF of AI prompts: `submission/Clara_AI_Prompts.pdf`
- [ ] 6 · Deck URL set to "anyone with the link can view", frozen after submission
- [ ] 7 · Written responses: drafted in `submission/written_responses.md`; needs team facts and partner findings

## Risk register

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Partner access is slow or blocked | M | **H** | Contact today on multiple channels. Fall back to surfers and ND peers. **Log every attempt.** | Research |
| R2 | Judges see "just another planner" | M | H | Lead with ambiguity detection plus the Surfer Bridge. Never call it a planner. Use a real Tec brief in the demo. | Pitch |
| R3 | Wrong dates or invented requirements (harm + demo failure) | M | H | Quotes for every item, date parsing in code, TC1/TC3 required to pass, verification UI | AI eng |
| R4 | Code-authenticity disqualification | L | **H** | Humans own the modules, ATTRIBUTION.md, everyone can explain the code, no unattributed templates | All |
| R5 | Scope creep (the "life agent") | H | M | P0/P1 lists are final. Ops can veto. Freeze on D6. | Ops |
| R6 | API key leaked in the public repo | L | H | `.env` gitignored, secret scan, keys only server-side | Eng |
| R7 | Missed progress report | M | **H** | Phone alarms at 9:00 and 21:00 for everyone | Ops |
| R8 | Pitch runs over 5 min / demo fails live | M | H | Timed rehearsals, demo ≤90 s, recorded backup video, offline screenshots | Pitch |
| R9 | Privacy incident with participants | L | H | Consent, anonymization, no diagnosis data | Research |
| R10 | LLM provider outage on pitch day | L | H | Cached demo responses and video backup | AI eng |

## Decision log

| Date | Decision | Why | Status |
|---|---|---|---|
| Oct 27 | Focus: autistic and ADHD **university students**, not the workplace | Partner population and rubric | Proposed |
| Oct 27 | Lead capability: **ambiguity decoding + "ask, don't guess"** | Research-backed friction; avoids "generic focus app" | Proposed, pending court and H1 |
| Oct 27 | No diagnosis data collected | Privacy (LFPDPPP) and reaching students who don't disclose | Proposed |
| Oct 27 | B2B2C (wellbeing offices pay) + B2C freemium | Sustainability | Proposed; pitch it as a hypothesis (court) |
| Oct 27 | **Court: GUILTY 12–0 on the full plan.** Build **Clara Lite** (decode + ask + start steps + changes + mentor summary) | Court conditions 1–3; the decoder is the distinct idea | **Decided** |
| Oct 27 | Stack: Next.js 15 + TypeScript, no DB/auth, Anthropic API (`claude-opus-5-5` by default, configurable via env), deploy on Vercel | Smallest failure surface: host + 1 LLM. No stored data means simple privacy | **Decided** |
| Oct 27 | Quotes are verified **in code**, not trusted from the model | Prevents invented requirements; it's measurable | **Decided** |
| Oct 27 | Demo at the partner meeting, **after** open discovery questions | The partner asked for a demo; the handbook says don't lead the questions | **Decided** |
| Oct 27 | Retrial deferred until after the partner meeting | Acquittal conditions depend on partner evidence | **Decided** |
| Oct 27 | Default effort set to `low` for decoding | Same quality as `medium` (19/19 and 12/12 quotes verified), 38 s vs. 49 s | **Decided** |
| Oct 27 | Ambiguities capped at 8 and ordered by importance (prompt decode-v1.1) | 12 was overwhelming in the first real run | **Decided** |
| Oct 27 | **No NotebookLM integration**. Voice input = P1 "instructions said in class", **only if H8 is confirmed** on Thursday. The vendor is picked through a bake-off | See `10_voice_input_decision.md` | **Decided (gated)** |
| Oct 27 | Pitch framing: partner theme **Socioemocional** (communication, cognitive flexibility, working memory) | Tec kickoff deck | **Decided** |
| Oct 27 | Team = 3 people. Agents build and document; humans review, own modules, and make their own edits | Code-review rule ("not entirely AI-generated") | **Decided**; confirm team size with organizers |
| Oct 27 (night) | **v2**: the partner's brand, several sources per assignment (incl. class audio and Teams transcripts), local history, grounded chat, calendar .ics + Google links, Canvas feed import, WhatsApp share, installable mobile-first app | The user tested v1 and found it not better than ChatGPT. See `12_v2_product_decisions.md` | **Done**; E2E 8/8, eval 10/10 |
| Oct 27 (night) | Notifications = the phone's calendar notifications (via .ics) plus the in-app Today view. Push and WhatsApp messaging are roadmap | Real push needs a backend (DB, scheduler). Calendar alarms are reliable and student-controlled | **Decided** |
| Oct 28 | **Whole-class audio orchestrator**: 10-minute parts with overlap → parallel Whisper with model switching and rate-limit waits → merge → map-reduce passage extraction (verified) → student review → decode. Needs a long-running server (local, Docker, container host), not Vercel | A 1.5-hour file failed against Groq's 25 MB limit. Measured: 66 min of audio processed in 53 s on the free tier | **Done** |
| Oct 27 (late) | **Cheapest-first model routing**: Groq free tier first (text, vision, Whisper), Anthropic only on rate limit, error or a failed quote check. ElevenLabs optional and off by default. Read-aloud uses the browser's voice | The team's direction: make the demo and MVP as cheap as possible. Chatterbox is text-to-speech, not transcription. See `13_cost_and_routing.md` | **Decided**; needs `GROQ_API_KEY` |
| Nov 4 | **v3**: one path, dark by default, display settings | The team found v2 too complex and overstimulating. See `14_simplification.md` | **Done** |
| Nov 4 | **Interest-based personalization**. Analogies allowed in explanation prompts only; extraction stays literal | See `15_interest_personalization.md` | **Done**; not tested with students |
| Nov 4 | Deployment: PWA in a container on Railway, personal account, no OAuth connectors. Supersedes Vercel | Class audio breaks serverless limits; stores cannot be reached before the pitch | **Decided** |
| Nov 4 | Web Push reminders with only ids and times on the server. Supersedes "push is roadmap" | A closed web app can only be woken by a push; texts stay on the phone | **Done**; needs real-phone test |
| Nov 4 | Pitch uses the **latest** benchmark (16/19 vs. 9/19), not the best | Honesty; the cause of the difference is not established | **Decided** |
| Nov 4 | Solution slide uses the 39 s video; the 105 s demo is the backup and Q&A material | Slides auto-advance; the script assumes 60 s per slide until organizers confirm | **Decided**; confirm on Discord |
