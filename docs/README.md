# Spark Challenge 2026: Project Docs (ops hub)

**Team goal:** win the Monterrey Launchpad (Nov 7) with a validated, production-deployed AI MVP for neurodivergent students, built with our Challenge Partner **Surfeando la Neurodiversidad** (Tec de Monterrey).

**Latest (Oct 27, late night): Clara v2 is built.**
- It uses the partner's brand, is mobile-first and installable, and keeps everything on the device.
- Each assignment can combine several sources (Canvas brief, rubric, class audio or Teams transcript, announcements). Clara detects where they contradict each other.
- Also new: a grounded chat with history, calendar export, Canvas feed import, and WhatsApp sharing.
- Verified: unit tests 18/18, end-to-end flow 8/8, eval 10/10. Against a generic chatbot, unclear points flagged 19/19 vs. 13/19.
- New video: `../clara/demo/clara-demo-es.webm` (2:42).
- Details in [12_v2_product_decisions.md](12_v2_product_decisions.md).

**Earlier status (Oct 27, night):**
- Court: the full plan was found **GUILTY 12–0**. **Clara Lite** is built in `../clara/` and runs with real AI.
- **Eval:** 8/8 test cases pass. Against a generic chatbot (same model):
  - unclear points flagged: **18/19 vs. 10/19**
  - invented values: **0 vs. 8**
  - wrote the assignment for the student: **0 vs. 2**
  
  This is synthetic and directional; details in `../clara/eval/results/latest.md`.
- **Demo video ready:** `../clara/demo/clara-demo-es.webm` (1:50, Spanish captions, real outputs).
- **Partner meeting: Thu Oct 29.** Kit: [09_partner_meeting_kit.md](09_partner_meeting_kit.md). The partner's theme for us is **Socioemocional** (see `02`).
- Voice input: **no NotebookLM integration.** A narrow "instructions said in class" input will be built only if the partner confirms H8 (see [10](10_voice_input_decision.md)).

| Doc | What's in it |
|---|---|
| [01_challenge_brief.md](01_challenge_brief.md) | Rules, rubric, deliverables, deadlines, disqualification risks (source of truth) |
| [02_partner_surfeando.md](02_partner_surfeando.md) | Partner profile, hypotheses H1–H7, interview guide (ES), usability protocol, ethics, evidence log |
| [03_research_evidence.md](03_research_evidence.md) | Problem evidence with sources, proto-personas, competitive landscape, white space |
| [04_concept_options.md](04_concept_options.md) | general_idea vs. AuraWork vs. recommended hybrid ("Clara"), scored against the rubric; kill criteria |
| [05_mvp_spec.md](05_mvp_spec.md) | Core loop, P0/P1/P2 features, design principles, AI design, privacy, **12 test cases**, demo script |
| [06_business_model.md](06_business_model.md) | BMC draft, unit economics, pricing, market, sustainability path |
| [07_execution_plan.md](07_execution_plan.md) | Day-by-day plan to Nov 7, roles, deliverables checklist, risk register, decision log |
| [08_feasibility_and_fallbacks.md](08_feasibility_and_fallbacks.md) | Build feasibility, failure surfaces, fallback concepts |
| [09_partner_meeting_kit.md](09_partner_meeting_kit.md) | **Thu Oct 29 meeting:** roles, agenda, open discovery questions, demo script, feedback questions, asks, Clara-vs-ChatGPT protocol |
| [10_voice_input_decision.md](10_voice_input_decision.md) | **Decision:** NotebookLM vs. voice recordings vs. alternatives, facts, the architecture if adopted, and the vendor bake-off rule |
| [13_cost_and_routing.md](13_cost_and_routing.md) | **Cost:** routing that tries the Groq free tier first, Anthropic only on escalation, ElevenLabs vs. Chatterbox vs. Whisper, cost per demo |
| [14_simplification.md](14_simplification.md) | **Clara v3 (Nov 4):** one flow (upload → work: tasks + chat → professor or finish), dark by default, display/accessibility settings, regional variants, what was cut and why, architecture diagrams |
| [12_v2_product_decisions.md](12_v2_product_decisions.md) | **v2 (Oct 27 night):** value over ChatGPT, class audio, history, calendar/Canvas/WhatsApp, notifications, brand, what was verified and what is still open |
| [11_code_walkthrough.md](11_code_walkthrough.md) | How the code works, file by file, plus likely code-review questions and honest answers |
| [court/](court/) | Verdicts from the internal adversarial validation (court skill). The full trial is in `../.court/` |

Raw inputs stay in `../raw/` (kickoff slides, original idea notes).

## One-liner (draft)
> **Clara turns ambiguous course instructions into clear, literal, step-by-step plans. When information is missing, it asks instead of guessing. It adapts to how each student works and keeps their peer mentor in the loop.**

## Top actions right now (before Thu Oct 29)
1. **Watch the demo video** and **try the app yourself** (`cd clara && npm run dev`). Each of the 3 members should read [11_code_walkthrough.md](11_code_walkthrough.md).
2. Assign the meeting roles (3 people, so combine them) and rehearse with `09_partner_meeting_kit.md`. **Discovery first, demo second.**
3. Ask in the **Teams channel**: (a) is a 3-member team OK (the handbook says 4–5)? (b) what is the "custom script URL"? Also confirm **someone on the team has a valid US visa** (required for the Phoenix final).
4. Upload the video to a shared Drive as a backup. It's git-ignored because it's 14.7 MB.
5. Keep the AM/PM progress reports going through Nov 5.
