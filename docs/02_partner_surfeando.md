# 02 — Challenge Partner: Surfeando la Neurodiversidad + Research Plan

## 1. Who they are (public facts, verified Oct 27 2026)

| Fact | Source |
|---|---|
| A program run by **Tec de Monterrey's Student Wellbeing area** (Bienestar Estudiantil) | Conecta Tec, 2025-06-05 |
| Serves students with an **official Autism Spectrum Disorder (ASD) diagnosis**, called "Neurosurfers" | Conecta Tec |
| Each student gets **two trained peer mentors ("surfers")**: one academic (homework, questions about classes) and one social (emotional support, campus life). Surfers are trained through the **PEER Peer Mentoring Diploma**. | Conecta Tec |
| Started as a pilot at the **Monterrey campus in Aug–Dec 2019**. Now active on **10 campuses** and has supported **50+ students**, mostly men. | Conecta Tec |
| Entry protocol: a mentor, teacher, or staff member identifies the need, then the student is interviewed, **teachers are notified, and the family is contacted** | Conecta Tec |
| Stated goal: *"Its goal isn't to reduce students' academic load, but rather to create more favorable conditions for them to tackle their challenges with less stress."* (Grecia Tovar, National Student Wellbeing Manager) | Conecta Tec |
| Reported difficulties: applying concepts in coursework and exams, isolation, **anxiety and emotional overload**, and at first **not answering the phone and replying to messages only occasionally** | Conecta Tec (case of an Innovation & Development Engineering graduate, Puebla campus) |
| Results in that case: grades went from 85–90 (2022) to 95–96 (2023), and the student began attending noisy campus events that used to cause anxiety | Conecta Tec |
| Making the program work takes coordination among students, families, faculty, mentors, academic leadership, and Student Success | Conecta Tec |

### From the Tec Monterrey kickoff deck ("Kickoff ASU by Tec", Canva, Oct 24; text extracted Oct 27)
- **The partner team that presented is Mentoría y Bienestar Estudiantil, Tec campus Querétaro.**
- **Roles in the program:**
  - Neurosurfer (autistic student)
  - social surfer
  - academic surfer
  - student mentor
  - emotional counseling
- The program explicitly covers **"Apoyo en función ejecutiva: comunicación, organización personal, planificación del tiempo y resolución de problemas."**
- **Timeline:**
  - Created in 2018.
  - Running at the Querétaro campus since 2022.
  - 2023: 5 phases with almost 400 people.
  - 2024: congress with 600 participants.
  - 118 peers trained as of Sept 17.
  - *(The Conecta article says the pilot was 2019, so the dates differ.)*
- **Theme assigned to Surfeando teams: "Socioemocional: regulación emocional, flexibilidad cognitiva y memoria de trabajo en la comunicación"** (the other theme, *Empleabilidad*, belongs to Specialisterne and Kairós).
- **Why they say they're the ideal partner:**
  - The transitions they see every day: **semester to semester, class to teamwork, home to campus autonomy.**
  - They offer four user perspectives: **student, peer, mentor, counselor.**
- **What they offer teams:**
  - Guided interviews with Neurosurfers who choose to take part, plus surfers, mentors, and counselors.
  - An opening session on **talking with autistic people from a neuro-affirming approach**.
  - An **ethics protocol**: informed consent, anonymity, and **psychological support for interviewees**.
  - **Findings returned to the community** at the end of the sprint.
- **Their motto: "Nada sobre nosotros sin nosotros"** (nothing about us without us).
- Their counseling team supports students but **does not replace external treatment**. Other parts of the network: CEDDIE (course design and analysis of results), department directors, and an "ABC de la Neurodiversidad" course (session on Oct 29).

**What this means for us:**
1. Pitch Clara through the **Socioemocional** lens:
   - *communication* → "ask, don't guess" and the professor message, which is self-advocacy
   - *cognitive flexibility* → the Change Translator
   - *emotional regulation* → less uncertainty, plus the calm design
   - *working memory in communication* → information written down in one place with sources, plus the possible voice input (see `10_voice_input_decision.md`)
2. Use **neuro-affirming language** everywhere: identity-first "autistic students", strengths-based, no "suffer" or "disorder" framing.
3. Use **their** ethics protocol for any session with Neurosurfers.
4. Plan to **give the findings back** to them.

### Implications for the product (our reading, to validate)

1. **The primary user is autistic.** Our design should lead with autism needs (literal language, predictability, handling ambiguity, sensory load, social communication) and support ADHD as a secondary user. The partner population, not a generic "neurodivergent" label, should drive the decisions.
2. **The partner's philosophy matches "don't do the work, lower the friction."** The product must never ghost-write assignments. It decodes, plans, and supports.
3. **There is already a human support system.** AI should *extend* the surfers into the time between sessions, not replace them. This is our strongest responsible-AI and partnership story.
4. **Async, low-pressure communication matters.** The student in the case study avoided phone calls, so we should avoid pushy notifications and phone-call-style interactions.
5. **10 campuses and a formal protocol** give us a credible pilot channel, which supports Growth & Scalability.
6. **Diagnosis is sensitive data** (LFPDPPP 2025 requires express written consent). We should design the tool to **not need a diagnosis at all**, so its value comes from preferences, not labels. This also helps the roughly 2/3 of students who never disclose.

## 2. Research goals (what we must learn this week)

The hypotheses to validate are below. Each one maps to a pitch claim, so if a hypothesis fails, we change the claim or the feature.

| ID | Hypothesis | Feature it justifies | Validated by |
|---|---|---|---|
| H1 | Ambiguous or open-ended instructions are a top-3 academic stressor for Neurosurfers | Ambiguity Decoder | Coordinator + surfer interviews; brief collection |
| H2 | Students avoid asking professors for clarification (social cost) and lose time guessing | "Ask, don't guess" + draft email | Surfer interviews |
| H3 | Starting tasks, estimating time, and knowing "when it's done" are frequent blockers | Micro-steps with "done when" | Surfer interviews, usability test |
| H4 | Unexpected changes (deadline moved, new announcement) cause outsized distress | Change Translator | Interviews |
| H5 | Academic surfers lack visibility into what happens between sessions | Surfer Bridge | Surfer interviews |
| H6 | Students prefer predictable, low-volume reminders on a schedule they choose | Calm reminders | Usability test, preference cards |
| H7 | The Student Wellbeing office would pilot or pay for a tool that extends mentor capacity (and what budget logic they'd use) | Business model | Coordinator interview |

## 3. Who to talk to (in priority order)

1. **Program coordinator(s)**, either nationally (Student Wellbeing) or at the campus level. 1 × 30–45 min. Covers H1, H5, H7, and the partner rules.
2. **Academic surfers**, 2–4 × 20–30 min. Covers H1–H5. They are the fastest, lowest-risk source because they are peers and already trained.
3. **Neurosurfers (autistic students)**, **only through the partner, with consent**, 2–5 people. Short interviews plus usability tests. Optional but very valuable.
4. **Backup if partner access is slow:** neurodivergent students from our own network (ADHD/autistic, self-identified, adults, with consent). Log every partner contact attempt so we stay compliant.

### Artifact request (very high value)
Ask the coordinator or surfers for **5–10 real assignment briefs or rubrics that Neurosurfers found confusing**, anonymized. These become our **golden test set** (see `05_mvp_spec.md` §Test cases) and the demo input. A real Tec brief in the demo is far more convincing than a made-up one.

## 4. Interview guide: coordinators and surfers (Spanish, 25–30 min)

> Intro: "Somos un equipo del North American AI Challenge. Estamos diseñando una herramienta de IA para estudiantes neurodivergentes. No venimos a vender nada; queremos entender su experiencia. Todo es anónimo, puedes saltar cualquier pregunta. ¿Podemos tomar notas (y grabar audio, opcional)?"

**A. Contexto (5 min)**
1. ¿Cómo es una semana típica de acompañamiento con un Neurosurfer? ¿Cada cuánto se ven?
2. ¿Qué tipo de dudas llegan más seguido a la sesión académica?

**B. Instrucciones y tareas (10 min)** → H1–H3
3. Cuéntame de la última vez que un estudiante se trabó con una tarea. ¿Qué pasó exactamente? *(pedir el caso concreto, no la generalización)*
4. Cuando una instrucción es ambigua ("analiza críticamente", "entrega un reporte profesional"), ¿qué hace el estudiante? ¿Pregunta al profesor? ¿Por qué sí o no?
5. ¿Qué parte cuesta más: entender qué piden, empezar, calcular el tiempo, o saber cuándo ya está terminado?
6. ¿Qué formato de instrucciones les funciona mejor? (lista, pasos numerados, ejemplo, visual)

**C. Cambios, sobrecarga y comunicación (7 min)** → H4, H6
7. ¿Qué pasa cuando un profesor cambia una fecha o agrega algo de último momento?
8. ¿Cómo prefieren comunicarse los estudiantes? (WhatsApp, correo, en persona) ¿Qué tipo de notificaciones les estresan?
9. ¿Qué situaciones generan sobrecarga sensorial o emocional en la semana académica?

**D. Entre sesiones (5 min)** → H5
10. ¿Qué te gustaría saber del estudiante *antes* de tu sesión que hoy no sabes?
11. Si el estudiante pudiera compartir contigo un resumen semanal (él decide qué se comparte), ¿lo usarías? ¿Qué debería incluir y qué NO?

**E. Cierre (3 min)** → H7 (coordinators)
12. ¿Qué haría que una herramienta así fuera un riesgo o una mala idea? *(guardrails)*
13. *(Coordinators)* Si funcionara, ¿quién en el Tec decidiría adoptarla y con qué criterio (evidencia, privacidad, costo)?
14. ¿Nos podrías compartir 2–3 instrucciones de tareas (anonimizadas) que hayan sido difíciles?

## 5. Usability test protocol (with the MVP, Oct 31 and Nov 2)

- **Participants:** 3–5 per round. Neurosurfers through the partner if possible, otherwise ND student volunteers. Sessions can be remote.
- **Consent script (ES):** voluntary, can stop anytime, no diagnosis asked, anonymous notes, screen recording only with an explicit yes.
- **Tasks:**
  1. Paste or upload this brief and tell me what you have to deliver and when. *(success = correct deliverables and date within 2 min)*
  2. Find what's unclear in the brief and what you'd ask the professor.
  3. Start the first step. Is it the right size? Mark it.
  4. The professor changed the brief (we give v2). What changed for you?
  5. *(optional)* Prepare the summary for your surfer. What would you remove?
- **Metrics:** task success rate; time to first step; **clarity before vs. after** ("¿Qué tan claro tienes qué hacer?" 1–5, asked before and after using the tool, which is a strong pitch number); SUS (System Usability Scale, 10 items); 1 open quote.
- **Observe:** moments of hesitation, any reading-overload signals, reactions to tone and wording.

## 6. Ethics & compliance checklist

- [ ] The partner approves contact with Neurosurfers *before* any interview with them.
- [ ] No diagnosis or health data is collected. Self-identification is optional and not stored.
- [ ] Get verbal or written consent, store it anonymized (P1, P2…), and record audio only with explicit permission.
- [ ] Quotes in the pitch are anonymized, and **the partner reviews any claims attributed to them before Nov 5**.
- [ ] Participants can withdraw their data.
- [ ] Credit the partner properly in the deck and repo.

## 7. Evidence log (fill during the week; feeds the pitch and written responses)

| Date | Who (role, anonymized) | Method | Key finding / quote | Hypothesis | Confirms / refutes |
|---|---|---|---|---|---|
| | | | | | |

**Contact attempts log** (protects against "partner non-compliance"):

| Date/time | Channel | Person/role | Outcome |
|---|---|---|---|
| | | | |

## Sources
- [Conecta Tec: Neurodiversity: Discover Tec support program for students with autism (2025-06-05)](https://conecta.tec.mx/en/node/158306)
- [Tec "Te Queremos": Surfeando la Neurodiversidad](https://tqueremos.tec.mx/es/surfeando-la-neurodiversidad)
- LFPDPPP 2025 (Mexico), sensitive data requires express written consent: [Hogan Lovells summary](https://www.hoganlovells.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies), [DOF text](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)
