# 08 — Feasibility (build capacity, failure surfaces) & Fallback Concepts

## 1. Build-capacity assumption
The build is **AI-assisted (Claude Code) with a human in the loop**. Claude writes and integrates code fast. Humans review, modify, and own every module.

> ⚠️ **Disqualification constraint, stated honestly:** the rules say *"Codebases must not be entirely AI-generated"* and need a human who can *"review, explain, and validate all submitted code."* So the team must (a) author meaningful parts themselves (prompts, UX copy, scheduling rules, tests, and at least some modules), (b) review every AI-written PR, (c) be able to explain any file in the code review (Nov 7–10), and (d) disclose AI assistance in `ATTRIBUTION.md`. Speed doesn't matter if we get disqualified after winning.

### Complexity per feature (assuming AI-assisted build)

| Feature | Complexity | Main failure mode | Simplification that removes the failure surface |
|---|---|---|---|
| F1 Input (text, PDF, image) | Med | Scanned PDFs, phone photos, big files | **Send PDFs and images directly to the LLM's native document/vision input.** No local OCR libraries. Cap the size. |
| F2 Decoder | Low–Med | Malformed JSON, invented items | Structured outputs (schema-enforced), mandatory quotes, golden-set evals |
| F3 Ask, don't guess | Low | Tone of the professor draft | Templates reviewed by humans. The student edits before sending. |
| F4 Planner | Med | Date and timezone errors, Spanish date formats | **The LLM proposes steps. Deterministic, unit-tested code schedules them.** |
| F5 Now view | Low | — | — |
| F6 Adaptation | Low–Med | Profile drift | Simple rules (step-size multiplier, pace factor), shown and editable |
| F7 Onboarding | Low | — | — |
| F8 ES/EN | Low | Mixed-language output | Language set explicitly in every prompt. Tests TC4. |
| F9 Deploy + auth | Med | Magic-link emails going to spam, redirect misconfiguration | **Anonymous sessions + optional login.** No email dependency on the critical path. |
| F10 Change Translator | Low–Med | Missing a subtle change | Diff of two decode JSONs in code + LLM wording only |
| F11 Surfer Bridge | Low | Over-sharing | Preview-and-delete UI. Share via a copy or link, no email. |
| F12 Calendar | Low | — | `.ics` file |
| F13 Reminders | **Med–High** | Cron jobs, email deliverability, push permissions | **Replace with `.ics` alarms (VALARM).** The student's own calendar notifies them at times they chose. No servers, no spam folders, predictable. |

**Verdict:** P0 plus P1 (with F13 done via .ics) is feasible in ~4–5 build days with AI assistance. The risk sits in **integration surfaces, not feature count**.

### Failure and downtime surfaces, ranked

| # | Surface | Risk | Mitigation |
|---|---|---|---|
| 1 | **LLM API** (latency 5–30 s, rate limits, outage, refusal) | High | Show progress while it streams, timeouts plus a retry, a fallback model, **cached fixtures for the demo path**, and a spend cap |
| 2 | **Date and timezone logic** | High (harm) | Parse dates in code (America/Monterrey). Unit tests for formats like "12 de noviembre", "viernes 13", "11:59 pm". |
| 3 | File input edge cases | Med | Native LLM PDF/vision input, size and page limits, a clear error message |
| 4 | Auth and email | Med | Anonymous-first, no email on the critical path |
| 5 | Serverless function timeouts on long LLM calls | Med | Streaming responses. *Verify the host's current limits before choosing a stack.* |
| 6 | Third-party OAuth (Google Calendar, Canvas, WhatsApp) | High | **Excluded from the MVP.** Use .ics instead. Google sensitive-scope verification and Canvas student-token policies at Tec are unknown and take days. |
| 7 | Prompt injection through briefs | Med | Guard prompt, briefs treated as data, TC8 |
| 8 | Cost runaway or abuse of a public URL | Low–Med | Per-session rate limit and a spend cap |
| 9 | Demo-day Wi-Fi | Med | Recorded video plus local fixtures |

**Design rule for the build:** *each external dependency must earn its place.* The MVP critical path should touch only **host + DB + one LLM provider**.

## 2. Partner meeting (already scheduled): what it needs
The partner wants a **demo, a proof of concept, and a video** so they can give real feedback. So **before the meeting** we need:
1. **A POC** of the core flow (Decode → Ask → Plan → Now) on 2–3 realistic briefs. It can be rough but must be real AI, not mockups.
2. **A 2–3 minute video** of that flow, in Spanish, with clear narration of what is and isn't built yet.
3. **Feedback questions** tied to H1–H7 (`02_partner_surfeando.md` §4) plus a request for real anonymized briefs.

→ This moves the first deployable POC to **before the meeting date (TBD)**. The plan in `07_execution_plan.md` needs updating once we know the date.

## 3. Fallback concepts (if the court verdict on Clara is negative)

Each one is mapped to the most likely reason Clara would fail, and each reuses most of Clara's pipeline.

| If court says… | Fallback | One-liner | Keeps | Trade-off |
|---|---|---|---|---|
| "Ambiguity isn't the main pain; **starting** is" | **F-A · Start Engine** | Turns any assignment into a ≤5-minute first step plus check-ins and AI "body doubling" at times the student chooses | Decoder, Planner, Now view | Closer to Tiimo and goblin.tools, so we must show the adaptation |
| "Too similar to goblin.tools / generic AI" | **F-B · Surfer Copilot** | A tool for the *peer mentors*: prepares each session from what the student shares, suggests evidence-based strategies, tracks goals | Surfer Bridge, Decoder | Users are mentors, so impact on ND learners is indirect. Very strong partner fit and B2B. |
| "Scope too big for a week" | **F-C · Clara Lite** | Only Decode + Ask, don't guess + Change Translator. No planner. | Core AI capability | Fewer "wow" moments. Very robust demo. |
| "Social and communication load is the bigger need" (Surfeando has a *social* surfer) | **F-D · Campus Translator** | Literal translation of professor emails and group chats into concrete tasks, plus rehearsal of hard messages (asking a professor, joining a team) | Translation prompts | Ethical risk (pressure to mask, misreading tone). Needs careful framing. |
| "Overload is semester-level, not assignment-level" | **F-E · Semester Radar** | Upload all syllabi at the start of the semester to get a week-by-week **load heatmap**, early crunch-week warnings, and a plan to spread the work | Decoder (multi-doc), Planner | Fewer demo surprises, but very predictable, which is autism-friendly. *It can also become a Clara module.* |
| "Workplace is the bigger market" | **AuraWork** (year-2 edition) | Transition-to-work version for ND graduates | Everything | Weak fit with the partner now. Use it as roadmap. |

**Recommendation if the verdict is negative:** decide based on *why* it failed, using the table above. If the jury splits, **Clara + Semester Radar as a module** or **Clara Lite** are the safest moves.
