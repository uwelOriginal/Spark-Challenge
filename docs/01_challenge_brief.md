# 01: Challenge Brief (source of truth for rules & deadlines)

Transcribed from `raw/Kickoff/*` plus the public pages linked at the bottom. If something here conflicts with an organizer message on Discord, the organizer wins. Update this file when that happens.

## What the challenge is

- **North American AI Challenge 2026**, run by the **Spark Center for Innovation in Learning (SCIL)** at ASU together with ASU Enterprise Technology. It runs Oct 24 to Nov 21, 2026, for teams in the US and Mexico.
- The official goal: *"build intelligent systems that decode executive function (the mental skills we use to plan, focus, and juggle tasks) to better support individuals with ADHD, autism, dyslexia… **look beyond standard productivity apps**; combine neurodiversity research, AI prototyping, and smart business thinking to create something truly new."*
- The kickoff slide adds: **"Avoid the generic focus app. A timer, reminder list, or task tracker is not enough on its own. Show a distinct, research-informed AI capability and a clear reason it matters in the user's real context."**
- Our Challenge Partner is **Surfeando la Neurodiversidad** (Tec de Monterrey, Student Wellbeing). See `02_partner_surfeando.md`.

## Hard deadlines (all times MT = UTC-7 on these dates; Monterrey = UTC-6)

| Date | What | Notes |
|---|---|---|
| Oct 25 – Nov 5 | **Progress report, twice a day (AM and PM), for every individual** | Missing them is grounds for disqualification. Use the Airtable form linked in `raw/Kickoff/links.txt`. |
| Oct 24 – Nov 6 | Customer research window with the Challenge Partner | Research must be referenced in the pitch. |
| **Thu Nov 5, 11:59 p.m. MT** | **All deliverables due. One submission per team. No extensions.** | That is **Fri Nov 6, 00:59 in Monterrey**. Internal target: **Nov 5, 12:00 MT**. |
| Fri Nov 6 | Scottsdale Launchpad (US teams) | |
| **Sat Nov 7** | **Monterrey Launchpad: live pitch and demo** | At least 2 team members must attend in person. 5 minutes max. |
| Nov 7–10 | Code review of top-ranked projects | Checks originality, AI usage, authenticity. Can change rankings. |
| Sat Nov 21 | Grand finale in Phoenix, AZ | Grand prizes total $15k according to the public page. One team from each Launchpad advances. |

## Rules (kickoff slide)

1. Pre-formed teams of 3–5 people. Individual registrations were due Oct 7.
2. **Must incorporate customer research data or strategies through a Challenge Partner.**
3. **Must build a functional minimum viable prototype (FMVP)** that uses AI and the partner research.
4. The FMVP must be **original work done within the 2-week sprint**.
5. No extensions.
6. Live pitch at a regional Launchpad by Nov 7, with at least 2 members present.
7. **Code review**: a team can be disqualified if its code is unreadable, fraudulent, or unoriginal.
8. **Everything submitted and presented must be in English.** The product UI can be bilingual.

## Deliverables (7)

| # | Deliverable | Specifics from the kickoff | Owner (TBD) |
|---|---|---|---|
| 1 | 5-minute live presentation | Must use the **official 5-slide template**: Title, User, Problem, Solution, What's next. No changes to layout, font sizes, or colors. Animations are allowed. Must cover the team, problem, solution, and demo scenario, **and reference the partner research**. | Pitch lead |
| 2 | MVP prototype of the AI tool | Must be a working prototype that demonstrates the core value. Not every feature is needed, but it has to work well enough for the jury to understand the UX and judge the role of AI. | Eng |
| 3 | Business Model Canvas | Strategyzer BMC. Upload it to the submission form before the Launchpad. The jury sees it and it counts toward the score. | Biz |
| 4 | Team GitHub URL | **Public** repo with no credentials, API keys, or private data. Reviewed for **authenticity and cleanliness, documentation, and attribution**. The slide also says it "includes info with a custom script URL", which is unclear (see open questions). | Eng |
| 5 | PDF of AI prompts | Must document all **system and context prompts**: base instructions, personas, guardrails. Can also include user/dynamic prompts, chain-of-thought and logic chains, and safety and formatting guidelines. | AI eng |
| 6 | Pitch deck URL | Google Slides set to "Anyone with the link can view". **Don't edit it after submitting**, because later changes won't transfer. | Pitch lead |
| 7 | Written responses | Submitted through the official form: executive summary, partner research and insights, future roadmap, and more. | Ops |

## Rubric: 50 points (10 criteria × 5)

| Criterion | What the judges look for | Our lever |
|---|---|---|
| MVP Development | Progress, usability, and completeness of the prototype | Deployed URL, real flows, no mock screens |
| User-Centered Problem | How clearly and empathetically the problem is defined through neurodiversity and executive function (autism, dyslexia, ADHD, mental health) | Partner quotes, personas validated with surfers |
| Impact & Inclusivity | Accessibility, empowerment, opportunity, inclusive design, responsible AI | Low-stim UI, bilingual, no diagnosis needed, autonomy |
| Functionality | Whether the demo does what it's meant to | Golden test set and a rehearsed demo path |
| Collaboration | Teamwork, complementary skills, inclusive practices | Clear roles, partner co-design, credit everyone |
| Principled Innovation | How meaningfully and responsibly AI is used | Source-grounded output, "asks instead of guesses", human mentor in the loop |
| Creativity & Vision | Originality | Ambiguity detection, Surfer Bridge, change translator |
| Tools & Techniques | Whether tech choices are appropriate and well integrated | Structured outputs, evals, ICS/calendar, prompt documentation |
| Pitch Storytelling | Clarity, engagement, staying within time | Story of one student, demo in under 90 s, timed rehearsals |
| Growth & Scalability | Long-term feasibility and real-world potential | B2B2C via wellbeing offices, unit economics, Tec to MX to US path |

## Grounds for disqualification (treat as hard constraints)

- **Partner non-compliance**: not engaging with the partner or not following partner rules. Log every contact attempt.
- **Solo participation.**
- **Missed deadlines**: the team form, the **twice-daily progress reports through Nov 5**, or the final submission.
- **Code authenticity and originality**: *"Codebases must not be entirely AI-generated, and teams must maintain a 'human in the loop' who can review, explain, and validate all submitted code."* Substantial resemblance to a previous hackathon project or repo means **immediate and retroactive disqualification**.

### What this means for us (ops)

1. Every module needs a human author or reviewer who can explain it line by line. Keep an `ATTRIBUTION.md` listing AI-assisted parts, libraries, and templates.
2. Don't fork a "starter AI app" template without attribution. Write our own core logic.
3. Treat prompts as first-class files (`/prompts/*.md`, versioned) from day 1. Deliverable #5 then comes almost for free.
4. Never commit `.env`. Add a pre-commit secret scan.
5. Set up AM/PM progress-report reminders for every teammate.

## From the Presenter Packet / Handbook (`raw/wpxeU/_For Presenters/`, read Oct 27)

- **Team size: the handbook says 4–5 students**; the kickoff slide said 3–5. ⚠️ Confirm that our team meets 4–5.
- **The submission form opens Fri Oct 30.**
- **Monterrey Launchpad: Sat Nov 7, 8:00–12:00, in person at Tec de Monterrey.** Slides **advance automatically**, and the pitch is capped at 5 minutes. **Jury Q&A can take up to 5 more minutes.**
- **A pre-recorded demo is strongly recommended** as a backup in case the live demo fails.
- What the handbook says makes a solution competitive: a specific, research-supported problem; novel and meaningful AI, "not AI added as decoration"; a working FMVP; **clear evidence that partner research influenced the design**; responsible handling of privacy, bias, accessibility, and **user agency**; a credible path to adoption.
- Partner-research guidance: assign a facilitator, note taker, timekeeper, and follow-up owner; ask **open questions that don't lead participants toward your idea**; avoid collecting unnecessary sensitive data; **confirm what you may quote or show**; keep direct evidence separate from your own interpretation; **write at least one statement on how the research changed your solution**. This is applied in `09_partner_meeting_kit.md`.
- Slide template (`REQUIRED - NA AI Challenge 5 Slide Template (Final).pptx`):
  - Title slide: venture name, all team members' first and last names in alphabetical order, the Launchpad, and the university logo.
  - Then User, Problem (tied to executive function), Solution (+ demo video or images), and What's next.
  - Only the existing placeholders can be used.
- The BMC template and a worked example ("Throughline") are in `raw/wpxeU/_For Presenters/Business Model Canvas/`.

## From the Tec Monterrey kickoff deck (Canva "Kickoff ASU by Tec")
- **The official channel for Monterrey teams is the Microsoft Teams group**, where the kickoff recording also lives. Discord is used too.
- **Local timeline:**
  - Oct 26–30: interviews and research with the partners.
  - Nov 2–5: prototype development.
  - Nov 5: hand in the pitch presentation.
  - **Nov 7: Launchpad in person at the Tec Lounge, Monterrey campus.**
- **Prizes:**
  - #1: US$15,000 (5k in scholarships + 10k in seed capital). The Monterrey winner advances to Phoenix on Nov 21.
  - #2: US$5,000 in scholarships.
  - #3: US$2,500 in scholarships.
- ⚠️ **To compete in the Phoenix final, at least one team member must hold a valid US visa.** Check now.
- There are 20 Monterrey teams, split between two themes: *Empleabilidad* (Specialisterne, Kairós) and **Socioemocional (Surfeando la Neurodiversidad)**.
- ⚠️ **Team size:** our team has **3** members. The kickoff slides say 3–5, but the handbook says 4–5. The team was accepted and assigned, so the risk is low, but **confirm in the Teams channel** to rule out a disqualification surprise.

## Technical code review (one-pager in `raw/Submission/`, git-ignored)

Four areas: authentic, collaborative, iterative history; purposeful code the team can explain; documentation that discloses external and AI help; code that matches the demo, considers the user and exposes no secrets. Audit: `submission/README.md`.

## Open questions for organizers / team

- [x] ~~What's behind `shorturl.at/wpxeU`?~~ It's the Presenter Packet, saved to `raw/wpxeU/`.
- [ ] What does "includes info with a custom script URL" on the GitHub slide mean? The handbook repeats "Include the required project information and custom script URL" without explaining it. **Ask on Discord.**
- [ ] Does our team meet the handbook's 4–5 member requirement?
- [ ] Does the kickoff's "ensure tool access" include free LLM credits (e.g., OpenAI/ASU)? This affects the stack choice.
- [ ] Who is our named contact at Surfeando, and what are the partner's rules (can we talk to Neurosurfers directly, or only to staff and surfers)?

## Sources
- Kickoff slides in `raw/Kickoff/`
- [NA AI Challenge page (ASU Enterprise Technology)](https://tech.asu.edu/na-ai-challenge)
- [ASU News: Student teams create AI tools to help neurodivergent learners (Dec 2025)](https://news.asu.edu/20251216-science-and-technology-student-teams-create-ai-tools-help-neurodivergent-learners)
- [Spark Center](https://eoss.asu.edu/sparkcenter)
