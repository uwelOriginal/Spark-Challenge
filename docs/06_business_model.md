# 06: Business Model (BMC source + unit economics)

> The submitted canvas is `submission/Clara_Business_Model_Canvas.pdf`, built by `submission/build_bmc.py`. Prices are hypotheses until the partner coordinator confirms them (H7).

> Sustainability thesis: **institutions pay, students never pay to be supported.** A B2B2C model sells through Student Wellbeing and disability offices, which already buy per-student assistive tech (Genio/Glean is the precedent). It's backed by a free B2C tier that reaches the roughly 2/3 of students who never disclose.

## Business Model Canvas (draft; copy into the Strategyzer template)

| Block | Content |
|---|---|
| **Customer Segments** | **Users:** autistic and ADHD university students, diagnosed or not, starting with Tec's Surfeando Neurosurfers (10 campuses, 50+ students supported). **Secondary users:** peer mentors (surfers). **Payers:** university Student Wellbeing, disability, or accessibility offices (Tec first, then MX private universities, then US disability resource centers). **Later:** all students (universal design), and ND graduates entering work. |
| **Value Propositions** | *Student:* "Know exactly what's being asked, what's unclear, and what to do next, without guessing, at your pace." *Mentor:* "Spend sessions on the real blocker, not on catching up." *Institution:* "Extend limited mentor hours across the whole week. No diagnosis data, measurable clarity and progress, aligned with 'less stress, not less load'." |
| **Channels** | Partner pilot through Surfeando and Student Wellbeing. Mentors onboard their students. Campus wellbeing events. Later: a Canvas LTI app (Instructure marketplace), ND student communities and creators, and app stores. |
| **Customer Relationships** | Co-design with an ND student advisory group. Self-serve app. A named success contact for each institution. A transparent "what Clara learned" profile builds trust. |
| **Revenue Streams** | (1) **Program license**: per supported student per year, sold to wellbeing or disability offices. (2) **Campus license** (year 2): all students, priced per enrolled student. (3) **B2C Pro** (freemium). (4) Non-dilutive grants and prizes (Spark finale, accelerators). |
| **Key Resources** | Prompt and eval IP plus a **golden dataset of real anonymized briefs**. The partner relationship and its credibility. ND co-design network. The team. |
| **Key Activities** | Product and AI engineering. Evaluation and safety testing every release. Co-design research. Institutional sales and pilots. Privacy compliance. |
| **Key Partners** | **Surfeando la Neurodiversidad / Tec Student Wellbeing** (pilot, research, distribution). Instructure (Canvas LTI). LLM providers (Groq first, Anthropic on escalation). ND self-advocacy organizations. Spark Center Venture Studio. |
| **Cost Structure** | LLM inference (small, see below). Hosting. Team. Compliance and legal (LFPDPPP, FERPA, accessibility audits). Customer success for institutions. |

## Unit economics (LLM prices verified Oct 27 2026)

Assumptions: an active student uses about **100k tokens/week** (≈4 decodes, ~10 plan/re-split calls, 1 weekly summary), split 80% input / 20% output. Mid-tier calls (decode, plan, diff) account for ~40% of tokens, and small-model calls for the other 60%.

| Model mix | $/active student/week | $/month | $/academic year (32 active wks) |
|---|---|---|---|
| All Haiku 5.5 ($0.10 / $0.50 per MTok) | $0.018 | ~$0.08 | ~$0.60 |
| **Mixed (recommended)**: Sonnet 5.5 ($2 / $10) for decode, plan, and diff | **~$0.155** | **~$0.67** | **~$5.00** |
| All Sonnet 5.5 | $0.36 | ~$1.56 | ~$11.50 |

Prompt caching of system prompts and the Batch API (50% off, for nightly summaries) would push these lower.

### Pricing hypotheses (validate with the partner coordinator, H7)

| Tier | Price | Gross margin (mixed model + ~$1/yr infra) |
|---|---|---|
| Program license (wellbeing cohort), min. 25 seats | **US$40 / student / year** (~MXN 700) | ~85% |
| Campus license (year 2, universal design) | US$2–4 / enrolled student / year, negotiated | depends on activation rate |
| B2C Free | 3 decodes/month, plan + Now view | marketing cost |
| B2C Pro | **MXN 69/mo** (~US$3.8) · US$4.99/mo in the US | ~80% |

Benchmarks: Tiimo ~US$4.5–12/mo, Structured US$3.99/mo, Genio/Glean sold as institutional licenses.

## Market (indicative; verify numbers before the pitch)
- **US:** ~15M+ undergrads (NCES). ~21% report a disability, and ~1/3 of those disclose. Self-reported ADHD is 17.2% and autism 4.9% (ACHA 2024).
- **Mexico:** ~5M higher-education students (ANUIES/SEP, *verify*). There's no national data on ND students, which shows how invisible the need is.
- **Beachhead (SOM, year 1):** Tec Surfeando cohort across 10 campuses, then Tec wellbeing-referred students with executive-function struggles, then 2–3 more MX private universities (UDEM, Ibero, ITESO).

## Path to sustainability (milestones, not fantasies)
1. **Nov 2026:** Challenge MVP plus partner validation. Pitch the evidence.
2. **Spring 2027:** **Free semester-long pilot** with Surfeando on 2–3 campuses. Measure clarity, on-time submission, mentor time saved, and SUS.
3. **Fall 2027:** First **paid program license** (Tec), based on the pilot data. Launch B2C freemium.
4. **2028:** Canvas LTI, then MX universities and US disability offices. Post-graduation edition for ND young professionals (the AuraWork idea).

## Business risks
- **Long university procurement cycles.** Mitigate with free pilots, grant funding, and B2C revenue in parallel.
- **Generic AI gets "good enough".** Our moat is partner-grounded design, the eval dataset of real briefs, the mentor loop, and institutional trust and privacy posture, not the model.
- **B2C willingness to pay among students is low.** Keep B2C as acquisition, and make institutions the revenue.
