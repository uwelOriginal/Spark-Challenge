# 16 · Current state of Clara (Nov 4, 2026, night)

The single place to see what exists, how it was checked and what is open. Where another doc disagrees, this one is newer. Submission tasks are in [`../submission/README.md`](../submission/README.md).

## In one paragraph

Clara is an installable web app for autistic and ADHD university students. It reads all the sources of one assignment, shows every fact with a checked quote, turns what is unclear into questions for the professor, gets the student started with small steps and reminders, and can explain through the student's interests. It never writes the assignment. Student work stays on the device.

## How the product got here

| Version | Date | What changed | Why |
|---|---|---|---|
| Clara Lite (v1) | Oct 27 | Decode one brief, quotes checked in code, ask don't guess | Adversarial concept review found the full plan too broad (`court/`) |
| v2 | Oct 27–28 | Partner colours, several sources, class audio, chat, calendar, Canvas, long-audio pipeline | Team tested v1: not visibly better than ChatGPT ([12](12_v2_product_decisions.md)) |
| v3 | Nov 4 | One path, dark by default, display settings | Team tested v2: too complex and overstimulating ([14](14_simplification.md)) |
| v3 + Studio | Nov 4 | Interests, packs, labelled analogies, figures, settings proposals | Team decision after reviewing the evidence and risks ([15](15_interest_personalization.md)) |
| v3 + mobile | Nov 4 | Relative dates, push reminders, install button, Canvas restored, access code screen | Make it usable as a phone app ([decision log](07_execution_plan.md)) |

## Features and how each was checked

| Feature | Where | Checked by | Not yet checked |
|---|---|---|---|
| Decode with verified quotes | `api/decode`, `lib/verify.ts` | Unit tests, benchmark TC1, TC4 | Real partner briefs |
| Contradictions and unclear points | `DECODE_SYSTEM` | Benchmark TC3, TC10 | Real briefs |
| Injection ignored, no ghostwriting | Prompts, `guard.ts` | Benchmark TC8, TC9 | Adversarial testing beyond the sample |
| Grounded chat with citations | `api/chat` | e2e-flow, e2e-studio | Students |
| What changed | `api/changes`, `lib/actions.ts` | Benchmark TC7, e2e-flow | Real announcements |
| Class audio, 10-minute clip | `api/transcribe`, `lib/stt.ts` | Unit tests, earlier real run | Real classroom noise |
| Whole-class audio | `api/audio-jobs`, `lib/jobs.ts` | Synthetic 66-minute run | 2–6 hours; real classroom; `tests/e2e-long-class.mjs` not re-run |
| Personal view (Studio) | `api/theme`, `lib/personal.ts`, `components/studio` | e2e-studio 21/21 with real AI | Autistic students; university-age evidence |
| Calendar file with reminder events | `lib/ics.ts`, `api/calendar` | Unit tests | Real iPhone |
| Push reminders | `api/push`, `pushServer.ts`, `sw.js` | e2e-reminders in desktop Chrome | Real phones; needs `VAPID_*` |
| Canvas calendar feed | `api/canvas` | Unit tests, demo feed | A real Tec feed |
| Relative dates ("mañana") | `DECODE_SYSTEM`, `lib/dates.ts` | Unit tests | Real sources |
| Professor email, mentor summary | `lib/templates.ts` (no AI) | e2e-flow | Partner review of tone |
| Display settings, contrast | `Settings.tsx`, `globals.css` | 72 contrast pairs computed, e2e | Screen readers |
| Access code, limits | `lib/guard.ts` | Used in the demo flow | Public deployment |

## Verification

| Check | Result | When |
|---|---|---|
| `npm test` | 81/81 | Nov 4, night |
| `npx tsc --noEmit`, `npm run build` | Clean | Nov 4, night |
| `tests/e2e-studio.mjs` (real AI) | 21/21 | Nov 4 |
| `tests/e2e-flow.mjs` (real AI) | 10/10, before the Studio and mobile work; re-run before the pitch | Nov 4 |
| `tests/e2e-reminders.mjs` (real AI, desktop Chrome) | Passed | Nov 4 |
| `npm run eval` | 10/10 test cases; Clara vs. chatbot below | Nov 4 |

### Benchmark

| Measure | Latest (Nov 4) Clara / chatbot | Earlier (Oct 27) Clara / chatbot |
|---|---|---|
| Unclear points flagged | 16/19 vs. 9/19 | 19/19 vs. 13/19 |
| Values invented or assumed | 1 vs. 2 | 0 vs. 5 |
| Briefs with assignment content written | 0 vs. 2 | 0 vs. 2 |

Use the latest row in the pitch. The drop has no established cause. The two runs used different code and models: in the latest, 3 of 5 decodes ran on Groq and 2 escalated to Anthropic after rate limits. All briefs are synthetic, with one run per version, so differences may be noise.

## Known limits

- **No usability study with autistic students.** Do not claim impact.
- Partner findings are not yet recorded in the repo ([02 §7](02_partner_surfeando.md)).
- Interest-based learning evidence comes mostly from children in school.
- Speaker labels are an estimate. The student reviews them.
- The rate limit is in memory and the reminder queue is a file, which suits a pilot but not scale.
- Sources pass through third-party AI providers during a request. A real pilot needs a privacy review under LFPDPPP and the providers' terms.

## Stack and deployment

- Next.js 15, React 19, TypeScript, zod. No database and no accounts.
- Routing: Groq free tier first, Anthropic on escalation ([13](13_cost_and_routing.md)).
- Deployment: PWA in a container on Railway, because class audio needs long jobs and large uploads. Vercel and Netlify limits break it. Config: `clara/Dockerfile`, `clara/railway.json`.
- Host variables: `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `CLARA_ACCESS_CODE`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, optionally `CLARA_DATA_DIR`.
- Demo assets (git-ignored): `clara/demo/clara-demo-en.mp4` (105 s), `clara-ad-en.mp4` (39 s), and Spanish versions.

Running `npm run eval` and `tests/e2e-reminders.mjs` back to back used up Groq's free daily tokens. Avoid that near the pitch.
