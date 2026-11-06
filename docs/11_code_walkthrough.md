# 11: Code Walkthrough (for human review and the code review)

The rules require a human who can **review, explain and validate all submitted code**. Read this file, then open each file in the order listed. Note your name in `clara/ATTRIBUTION.md` only after you have actually done it. The app is about 6,700 lines.

## 1. One request, end to end

See [`diagrams/03-decode-sequence.png`](diagrams/03-decode-sequence.png). In short:

```
Student taps Read ─► lib/actions.ts ─► lib/api.ts ─POST /api/decode─► route.ts
                                                                       │ guard(): access code, rate limit
                                                                       │ readSources(), fence(): validate, neutralize tags
                                                                       │ routeStructured(): Groq, then Anthropic
                                                                       │    accept(): at least 85% of quotes found?
                                                                       │ checkDecode(): verified flags, weekday check
UI renders tasks and quotes; store.ts saves on the device ◄── JSON ────┘  (nothing stored on the server)
```

## 2. Files, in reading order

| # | File | What it does | The one thing to be able to explain |
|---|---|---|---|
| 1 | `src/lib/schemas.ts` | The JSON shapes the AI must return (zod) | The schema is the contract with the UI, and it is validated again locally |
| 2 | `src/prompts/index.ts` | All 7 system prompts | Why extraction is literal and explanation may use labelled analogies |
| 3 | `src/lib/llm.ts`, `groq.ts` | The router, the only path to a model | Cheapest first; what triggers escalation; why a refusal is final |
| 4 | `src/lib/verify.ts` | Checks quotes, citations, weekday vs. date | We do not trust the model's claim that a quote is real |
| 5 | `src/lib/guard.ts` | Access code, rate limit, size limits, `fence()` | Why document text cannot close our tags |
| 6 | `src/app/api/decode`, `chat`, `changes`, `theme` | AI routes | Same pattern: guard, validate, route with `accept`, check |
| 7 | `src/lib/personal.ts` | Packs, theme checks, settings whitelist | `themeProblems()` and `changeToPatch()`: the model proposes, code limits |
| 8 | `src/lib/stt.ts`, `transcript.ts`, `api/transcribe` | Short class audio | Whisper has no speakers, so labels are estimated and the student reviews them |
| 9 | `src/lib/jobs.ts`, `longaudio.ts`, `api/audio-jobs` | Long recordings | Parts, overlap, parallelism, rate-limit waits, map-reduce ([diagram](diagrams/05-whole-class-audio.png)) |
| 10 | `src/lib/actions.ts` | Every AI flow the UI runs | Components render; this file thinks. Done steps are stored by text |
| 11 | `src/lib/store.ts` | Local-first state, migration, derived values | Why there is no server database |
| 12 | `src/lib/ics.ts`, `calendar.ts`, `dates.ts`, `api/calendar`, `api/canvas` | Calendar files, Canvas feed, dates | Why `api/canvas` rejects private addresses (SSRF) |
| 13 | `src/lib/pushServer.ts`, `notify.ts`, `public/sw.js`, `api/push` | Reminders | The server holds ids and times; texts stay on the phone ([diagram](diagrams/08-reminders-sequence.png)) |
| 14 | `src/lib/templates.ts`, `i18n.ts`, `dialects.ts` | Wording | Templates, not AI, write the email. The output language is whitelisted |
| 15 | `src/components/ClaraApp.tsx`, `Home.tsx`, `MaterialInput.tsx`, `Workspace.tsx`, `Wrapup.tsx`, `Settings.tsx`, `ui.tsx`, `InstallButton.tsx` | UI | One `useState` router, one intake component |
| 16 | `src/components/studio/*` | Boards, figures, background | AI returns data, pictures come from a fixed list, so it never writes markup |
| 17 | `src/app/globals.css`, `layout.tsx` | Tokens, themes, pre-paint script | Why components never read the theme |
| 18 | `tests/*.test.ts` | 81 unit tests | Run `npm test` |
| 19 | `tests/e2e-*.mjs` | Real-browser, real-AI flows | They use real AI quota |
| 20 | `eval/run-eval.mjs` | 10 test cases and the benchmark | The baseline is the same model, so it isolates the design. Know its limits |

## 3. Likely code-review questions

- **"Is this AI-generated?"** Yes, most first drafts were, by Claude Code under our direction, and `clara/ATTRIBUTION.md` says so. Be ready to explain what you reviewed and changed yourself.
- **"What does AI do that normal code could not?"** It reads unstructured instructions and class speech, and separates what is stated from what is missing, vague or contradictory. Code then verifies it. Templates write the messages.
- **"How do you prevent hallucinations?"** A schema, a mandatory verbatim quote checked in code, a "never invent" rule, and contradictions flagged rather than resolved. It is not perfect: the latest benchmark counted 1 invented value in 5 briefs.
- **"Privacy?"** No database, accounts or diagnosis question. Sources pass through AI providers during a request. The server keeps only push addresses, ids and times. Keys stay server-side in a git-ignored `.env`.
- **"Prompt injection?"** Sources are fenced as data and the prompts say to ignore and flag instructions. Test TC8 passes. A sample test is not proof against every attack.
- **"Why did scores drop between benchmark runs?"** We have not established a cause. See [`16_current_state.md`](16_current_state.md).
- **"Why not Vercel?"** Long class-audio jobs and large uploads need a long-running server.

## 4. Changing things safely

- Prompt wording: edit `src/prompts/index.ts`, bump `PROMPT_VERSION`, run `npm run eval`, rebuild the prompts PDF with `python submission/build_prompts_pdf.py`.
- Model or cost: set `CLARA_MODEL` or `CLARA_ROUTE`, re-run the eval and compare.
- New UI text: add it to **both** languages in `i18n.ts`.
- Before a demo: `npm test`, `npm run build`, then one real-AI browser test. Watch the Groq daily quota.
