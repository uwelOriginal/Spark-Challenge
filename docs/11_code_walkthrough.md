# 11 — Code Walkthrough (for human review and the Nov 7–10 code review)

The rules require a human who can **review, explain, and validate all submitted code**. Read this file, then open each file in the order listed. The whole app is about 900 lines.

## 1. One request, end to end
```
Student pastes text ──► ClaraApp.tsx  decode()  ──POST /api/decode {text, lang}──►  route.ts
                                                                                  │ guard(): access code, rate limit, size
                                                                                  │ structured(DecodeSchema, DECODE_SYSTEM, text)   ◄── llm.ts
                                                                                  │      └─ Anthropic API, structured output (zod schema)
                                                                                  │ checkDecode(text, result)                        ◄── verify.ts
                                                                                  ▼      └─ marks each quote verified / not found
ClaraApp.tsx renders 6 sections ◄────────────── JSON {..., verified flags, quote_check}
```

## 2. Files, in reading order

| # | File | What it does | The one thing to be able to explain |
|---|---|---|---|
| 1 | `src/lib/schemas.ts` | Defines the exact JSON shape the AI must return (zod). | The schema is the contract. The model **cannot** return a different shape, because the API enforces it (structured outputs). |
| 2 | `src/prompts/index.ts` | The 3 system prompts (decode, changes, transcribe) with a version number. | The rules that make Clara literal, make it quote, ban guessing, and ban writing the assignment. This file is also Deliverable #5 (the PDF of prompts). |
| 3 | `src/lib/llm.ts` | The **only** file that talks to the model. `structured()` returns validated JSON. `transcribe()` turns an image or scanned PDF into text. | Model and effort come from env vars. `fallbacks: "default"` makes the API retry on a fallback model if one refuses. Errors become friendly codes. |
| 4 | `src/lib/verify.ts` | Checks each quote against the student's text, ignoring spacing, case, and quote-mark style. | **Why it exists:** we don't trust the model's claim that a quote is real; code checks it. That's how "0 invented requirements" becomes measurable. |
| 5 | `src/lib/guard.ts` | Optional access code, per-IP rate limit, size limits, and tag fencing. | It protects the API bill on a public URL and keeps document text from escaping our `<document>` tags. |
| 6 | `src/app/api/decode/route.ts` | Validates input, calls `structured()`, then `checkDecode()`. | Nothing is stored. The document only exists during the request. |
| 7 | `src/app/api/changes/route.ts` | Same pattern for comparing two versions of a brief. | Quotes are checked against **both** versions. |
| 8 | `src/app/api/extract/route.ts` | A PDF with a text layer is read locally (no AI). A scanned PDF or an image goes to AI transcription. | The student always reviews the extracted text before decoding (user agency). |
| 9 | `src/lib/templates.ts` | The professor message and mentor summary. **Plain templates, no AI.** | It's predictable on purpose: the student controls the wording, and Clara never sends anything. |
| 10 | `src/lib/i18n.ts` | All UI text in Spanish and English. | Wording rules: literal, no idioms, no exclamation marks, no guilt. |
| 11 | `src/components/ClaraApp.tsx` | The whole UI: the input screen and 6 result sections with a "one section at a time" mode. | State lives in React only (no database). Drafts regenerate until the student edits them by hand. |
| 12 | `src/app/globals.css` | The calm design: muted palette, no animation, 18 px text, large tap targets, dark mode. | The accessibility choices and why we made them. |
| 13 | `tests/verify.test.ts` | 8 unit tests of the quote checker. | Run with `npm test`. |
| 14 | `tests/ui-render.mjs` | UI test with the API **intercepted** by a fake response. | It tests layout only, never AI quality. |
| 15 | `eval/run-eval.mjs` | 8 test cases plus the Clara vs. generic chatbot benchmark, judged blind. | The baseline is the **same model**, so the comparison isolates our design. The limitations are stated in the output. |
| 16 | `eval/record-demo.mjs` | Records the Spanish demo video with captions, using real AI calls. | No fake outputs. |

## 3. Likely code-review questions (and honest answers)
- **"Is this AI-generated?"** It was AI-assisted (Claude Code), under the team's direction. The team owns the design decisions, the prompts, and the review. `clara/ATTRIBUTION.md` lists each module's human owner. *Before Nov 5: each owner makes at least one real change to their module and can walk through it.*
- **"What does the AI do that a normal app couldn't?"** It reads unstructured instructions, separates what is stated from what is missing, vague, or contradictory, and writes literal steps. Code then **verifies** every quote, and templates (not AI) produce the messages.
- **"How do you prevent hallucinations?"** Schema-enforced output, a mandatory verbatim quote checked in code, a "never invent requirements" rule, and contradictions flagged rather than resolved. Latest eval: 61/61 quotes verified, 0 invented values (vs. 8 for a generic chatbot).
- **"Privacy?"** No database, no accounts, no diagnosis question. Documents are processed per request. Keys stay server-side in a git-ignored `.env`.
- **"Prompt injection?"** The document is fenced as data, and the prompt tells the model to ignore instructions inside it and flag them. Test TC8 passes; the generic chatbot obeyed the injected instruction and wrote the code.

## 4. Changing things safely
- Prompt wording → edit `src/prompts/index.ts`, bump `PROMPT_VERSION`, run `npm run eval`.
- Model or cost → set `CLARA_MODEL` (e.g. `claude-sonnet-5-5`) in `.env`, re-run the eval, and compare.
- New UI text → add it to **both** languages in `i18n.ts`.
- Always run before a demo: `npm test`, then `npm run build`, then `npm run eval`.
