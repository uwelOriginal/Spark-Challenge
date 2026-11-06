# 04: Concept Options & Recommendation

## The three candidates

**A · `general_idea.txt` as written: "Personal executive-function agent"**
An AI that turns confusing instructions, big tasks, and deadlines into a personal plan of 10–30 minute steps with reminders. It adapts to the student's preferred format, pace, and reminders, connects to whatever the user needs, and **organizes their whole life**, focusing on overstimulated ND students.

**B · `idea_inspiration.txt`: "AuraWork": a cognitive equalizer for the workplace**
Three pillars: (1) a literal "corporate translation" filter, (2) a task deconstructor, (3) an energy-budget calendar guard. The target is ND *professionals* across Slack, Email, Zoom, and Jira.

**C · Recommended: focused hybrid, working name "Clara"** *(Spanish for "clear")*
> **Clara turns ambiguous course instructions into clear, literal, step-by-step plans. When information is missing, it asks instead of guessing. It adapts to how each student works and keeps their peer mentor in the loop.**

It keeps A's core loop (instructions → 10–30 minute steps → reminders → adaptation) and B's best mechanism (literal translation and energy awareness), applied to the partner's real users: **autistic (and ADHD) university students at Tec**.

## Scoring against the rubric (1–5, our judgment; Collaboration excluded because it depends on the team)

| Criterion | A · Life agent | B · AuraWork | C · Clara | Why C scores higher |
|---|---|---|---|---|
| MVP Development | 3 | 4 | **4** | Narrow scope can be finished in a week. A's "connect to everything" can't. |
| User-Centered Problem | 3 | 2 | **5** | Built on the partner population and the documented autism friction with ambiguous briefs. B targets workers, not the partner's students. |
| Impact & Inclusivity | 3 | 3 | **5** | No diagnosis needed, bilingual, low-stimulation UI, reaches students who don't disclose. |
| Functionality | 3 | 4 | **4** | Single input → visible output. A deterministic demo path is possible. |
| Principled Innovation | 3 | 3 | **5** | Source-quoted extraction, "asks instead of guessing", never writes the assignment, human mentor in the loop, student controls sharing. B's auto-declining meetings raises autonomy concerns. |
| Creativity & Vision | 2 | 3 | **4** | A overlaps heavily with goblin.tools and Tiimo ("generic focus app" risk). C's ambiguity detection and Surfer Bridge are new. |
| Tools & Techniques | 3 | 3 | **4** | Structured outputs, evals on real briefs, ICS export, change diffing. B's Slack/Jira integrations aren't realistic in a week. |
| Pitch Storytelling | 3 | 4 | **4** | B has the best hook. C reuses it ("the invisible work before the work"). |
| Growth & Scalability | 3 | 4 | **4** | B2B2C through wellbeing and disability offices (Genio/Glean precedent). The roadmap path is Tec → MX universities → US → transition-to-work (AuraWork becomes our year-2 product). |
| **Total /45** | **26** | **30** | **39** | |

> These are estimates to argue with. The `court` run (see README) stress-tests C.

## What we take from each, and what we cut

| Keep from A | Keep from B | Cut (moved to roadmap) |
|---|---|---|
| Instruction → 10–30 minute steps → reminders → adapt | Literal translation (applied to briefs, announcements, professor messages) | "Organize the whole life" / connect to everything |
| Learns the format, pace, and reminders that work | Energy awareness (light version: the student tags draining days and times) | Slack, Jira, and Zoom integrations |
| Focus on overstimulation (calm UI, low notification volume) | The hook: "the invisible architecture of work" | Auto-declining or auto-rescheduling anything on the user's behalf |
| | Post-graduation version (year 2) | Tone-judging of people's messages (high misread risk, and goblin.tools already does it) |

## Why "ambiguity" is the wedge (the one-sentence insight)

For autistic students, the hardest part of an assignment is often **figuring out what the work actually is**: open-ended briefs, unstated expectations (the "hidden curriculum"), no indication of length or time, and last-minute changes. That burns executive energy before the task even starts, and asking the professor has a social cost. **Generic AI fills the gaps with confident guesses. Clara shows the gaps, quotes the source, and helps the student ask.**

This puts the rubric phrase "a distinct, research-informed AI capability and a clear reason it matters in the user's real context" directly into the product.

## Kill criteria (when we'd drop or pivot C)
- Partner interviews show ambiguity is **not** a top-3 friction (H1 fails). Then we pivot the lead feature to whichever friction ranks first (likely task initiation or changes) and keep the same architecture.
- By end of D2 (Oct 29), the Decoder gets dates or deliverables wrong in **more than 2 of 10** golden briefs. Then we narrow the scope (text-only input, one language) and add mandatory confirmation.
- The partner objects to the Surfer Bridge (privacy or culture). Then we drop it from the MVP and keep it as a roadmap item only with their co-design.
