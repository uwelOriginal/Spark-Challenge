# 03: Problem Evidence, Personas, Competitive Landscape

Confidence tags: **[strong]** = peer-reviewed or official statistics · **[moderate]** = smaller studies or secondary reporting · **[weak]** = anecdotal or commercial. Don't put [weak] claims in the pitch.

## 1. Problem evidence

### Scale
- **About 21% of US undergrads report a disability** (NCES 2019–20), but only **about one-third disclose it to their college** (NCES 2022 report, cited by PNPI/BestColleges). **[strong]** → *Most students who struggle never reach disability services. A tool that needs no diagnosis reaches the other two-thirds.*
- **Self-reported ADHD: 17.2% of undergrads. Autism: 4.9%.** (American College Health Association, 2024, n≈25,500). **[moderate]**, since this is a self-report survey and not a count of diagnoses.
- **Mexico:** we found no national figure for neurodivergent students in higher education. That gap is itself an insight, and partner data can help fill it. General estimates: ADHD in about 2.5% of adults, autism in about 1 in 115–130 children (Universidad Veracruzana). **[moderate]** UdeG forums name **stigma and lack of teacher empathy** as the main barriers. **[moderate]**

### Outcomes
- **ADHD:** In the Lehigh/DuPaul longitudinal study (~400 students), students with ADHD had a **GPA about 0.5 lower**, starting in freshman year and persisting. **8-semester persistence was 49% (unmedicated ADHD) vs. 59.1%**. **More than half received no academic support.** Planning and time-management skills predicted success. **[strong]**
- **Autism:** A 2026 systematic review (Campbell & Alliot, OSF preprint) found **dropout is elevated and achievement lower** than for neurotypical peers. It also says the exact role of executive function is poorly understood. **[moderate]**

### The specific friction (this is our wedge)
- Autistic students report **difficulty with ambiguous and open assignment briefs, unclear reasons for tasks, and not knowing how much time to spend** (multinational study led by Leeds Beckett: literature review, 281 survey responses, 16 case studies). **[moderate–strong]**
- They also find it hard to understand instructions about *how* to organize, plan, and complete an assignment. **Concrete instructions and smaller assignments help.** (UK university guidance and student-report summaries.) **[moderate]**
- **Group work** is hard for most autistic students surveyed (DCU). **[moderate]**
- From the partner case: **anxiety and emotional overload, isolation, avoiding phone calls**. **[moderate, n=1 public case]**

### AI with autistic users: benefits and risks
- Autistic users already use ChatGPT **as a "translator" between autistic and neurotypical communication styles** (arXiv 2601.17946, thematic analysis). **[moderate]**
- TwIPS, an LLM texting app for autistic users: **7 of 8 participants** wanted to keep using its features. The authors flag risks around **autonomy, over-reliance, and appropriate trust**. **[moderate, small n]**
- Generative AI ≠ AAC. Communication needs vary widely, so we shouldn't over-generalize (Autism Spectrum News). **[weak–moderate]**
- Students **fear being accused of cheating** when using AI (ASU 2025 challenge participant). → *Our tool must visibly never write the assignment.* **[weak, anecdote, but it's a design insight]**

### Interventions that inform our design
- Organization and time-management programs for college students with ADHD (ACCESS RCT n=250, OTMP-style programs, Knouse telehealth 2026) show **preliminary efficacy** for planning, time management, and organization skills. **[moderate]** → We *operationalize* the same skills (break down, schedule, review) but **we don't claim clinical efficacy**.

## 2. Proto-personas (validate with surfers; replace with real quotes)

**P1 · "Diego", 20, autistic, 4th semester Mechatronics, Neurosurfer (primary)**
- Strong in technical subjects. Reads instructions literally. Gets stuck when a humanities or ethics brief says "reflexiona críticamente" with no length or format.
- Won't email the professor because he doesn't know how to phrase it or fears looking dumb. He guesses, over-works, and misses the actual rubric.
- A deadline move announced in Canvas ruins his plan for the day. Crowded classrooms drain him, so afternoons are low-energy.
- Meets his academic surfer weekly, but by then he has lost 4 days.
- **Needs:** literal, explicit "what is being asked"; permission and a script to ask; predictability; small steps with a clear "done".

**P2 · "Valeria", 19, ADHD (diagnosed but not disclosed to the university), 2nd semester Business (secondary)**
- Time blindness. Starts the night before. Six courses' worth of Canvas notifications feel like noise.
- Has tried Notion and to-do apps and abandoned them within a week. Plans feel like homework.
- **Needs:** a first step that takes under 10 minutes, realistic time estimates, low-noise nudges, and no need to set anything up.

**P3 · "Andrea", 22, academic surfer (secondary user / champion)**
- Has 1–2 Neurosurfers alongside her own studies. Sessions start with 15 minutes of "where are you stuck?".
- **Needs:** a short summary, shared by the student, of what's pending and where they're stuck, *without* surveillance.

**P4 · Campus Student Wellbeing coordinator (buyer)**
- Limited mentor hours and a growing caseload. Must report impact. Very sensitive to privacy and family concerns.
- **Needs:** evidence of impact, privacy by design, low staff overhead, and alignment with the program philosophy ("less stress, not less load").

## 3. Competitive landscape

| Product | What it does | Price | Gap vs. our concept |
|---|---|---|---|
| **goblin.tools** (Magic ToDo, Judge, Formalizer, Compiler…) | Single-shot AI: breaks down a task (adjustable "spiciness"), reads tone, rewrites formality. Free on web, paid app. | Free web / ~$1 app | **Closest substitute for the "breakdown" and "translation" ideas.** No course context, no memory or adaptation, no calendar, no ambiguity detection, no human loop. |
| **Tiimo** | Visual daily planner for ADHD/autism with an AI Co-Planner that turns a brain dump into a plan | ~$4.5–12/mo (sources conflict) | General life planning that isn't course- or brief-aware. Some users find the AI output generic. |
| **Structured** | Visual timeline day planner | Free / $3.99 mo | No AI decoding. |
| **Motion / Reclaim** | AI auto-scheduling for professionals | $$ | Built for knowledge workers. Cognitively heavy UI. |
| **ChatGPT / Gemini / Copilot (generic)** | Can do anything if prompted well | Free–$20 | Puts the prompting burden on the student, has no persistence or guardrails, and guesses when info is missing. Cheating stigma. |
| **Canvas To-Do / calendar** | Lists due dates | Included | No interpretation. Notifications are noisy. |
| **Genio Notes (ex-Glean)** | Note-taking accommodation | Institutional licenses (min. 5), distributed by disability offices | **Business precedent:** shows that disability offices *do buy* per-student AT licenses. |
| **Focusmate** | Virtual body doubling | Free / $6.99 mo | Complementary. A possible later feature. |

### White space (why our concept isn't "another planner")
No product we found does all four of these:
1. **Reads the actual course material** (brief, rubric, announcement) instead of a blank to-do field.
2. **Detects ambiguity and missing information and turns it into questions** (with a draft message to the professor) instead of guessing. *Generic AI guesses. We ask.*
3. **Adapts transparently** to the person's step size, pace, format, and reminder style from explicit feedback, with no diagnosis needed.
4. **Closes the loop with human support** (the peer mentor) through a summary the student controls.

## Sources
- [ACHA/NCES statistics roundup (BestColleges)](https://www.bestcolleges.com/research/students-with-disabilities-higher-education-statistics/) · [PNPI fact sheet Nov 2024](https://pnpi.org/wp-content/uploads/2024/11/StudentswithDisabilities_FactSheet_Nov24.pdf)
- [Lehigh: college students with ADHD and academic challenges](https://news.lehigh.edu/researchers-find-college-students-with-adhd-are-likely-to-experience-significant-academic) · [HealthDay coverage](https://www.healthday.com/health-news/child-health/3-3-college-students-with-adhd-have-lower-grades-higher-dropout-rates-2650812458.html)
- [Executive functioning difficulties in autistic and ADHD postsecondary students: systematic review (Strathclyde)](https://strathprints.strath.ac.uk/96498/)
- [Leeds Beckett-led multinational study on autistic students (IATED)](https://library.iated.org/view/FABRI2016HUR) · [Irvine & MacLeod literature review (Birmingham)](https://research.birmingham.ac.uk/en/publications/what-are-the-challenges-and-successes-reported-by-autistic-studen/) · [DCU survey](https://doras.dcu.ie/23340/)
- [Universidad Veracruzana (TEA/TDAH)](https://www.uv.mx/prensa/tag/tea/) · [UdeG CUCSH forum](https://www.comsoc.udg.mx/print/91657)
- ["I Use ChatGPT to Humanize My Words" (arXiv 2601.17946)](https://arxiv.org/pdf/2601.17946) · [TwIPS (arXiv 2407.17760)](https://arxiv.org/html/2407.17760v1) · [Autism Spectrum News](https://autismspectrumnews.org/when-ai-functions-as-an-autism-support/)
- [ACCESS RCT (IES)](https://ies.ed.gov/use-work/awards/improving-educational-and-social-emotional-functioning-college-students-adhd) · [Organizational skills intervention (Penn State)](https://pure.psu.edu/en/publications/efficacy-of-an-organizational-skills-intervention-for-college-stu/) · [Knouse 2026 (Richmond)](https://scholarship.richmond.edu/psychology-faculty-publications/121)
- [goblin.tools overview (K20)](https://learn.k20center.ou.edu/tech-tool/3864) · [Tiimo pricing comparison (Habi)](https://habi.app/insights/best-adhd-planner-apps/) · [Genio/Glean pricing](https://glean.co/pricing) · [Columbia Chronicle on Glean](https://columbiachronicle.com/campus/online-ai-tool-replaces-peer-notetakers-at-columbia/)
