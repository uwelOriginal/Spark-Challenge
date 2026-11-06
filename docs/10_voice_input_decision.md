# 10: Decision: NotebookLM integration vs. voice-recording input

> **Update (Oct 28):** whole classes (2–6 h) are now supported. A background job splits the recording, transcribes the parts in parallel with Groq Whisper, and extracts only the coursework passages, each verified, for the student to review. Measured: a 66-minute class went from upload to passages in 53 s. See `13_cost_and_routing.md` §2b. The "≤10 min clip" limit below no longer applies. Consent and the professor's permission still do.

**Status:** Decided on Oct 27, conditional on hypothesis H8 at the partner meeting on Thu Oct 29.
**Short version:** Don't integrate NotebookLM. If the partner confirms the need, add a narrow **"instructions said in class"** voice input. A transcription API with speaker separation feeds Clara's existing pipeline, and the student starts it with one tap.

## 1. The question
Proposal: the student records a class. NotebookLM separates voices, filters noise, finds the key points, summarizes them, and Clara uses the result. The student only presses one button. Should we do this, or build voice input another way?

## 2. Why it's worth considering (the real need)
- The partner's assigned theme is **Socioemocional: emotional regulation, cognitive flexibility, and working memory *in communication*.** Their deck lists the transitions they see: semester to semester, **class to teamwork**, home to campus autonomy.
- Clara today only reads **written** instructions. Instructions and last-minute changes that are **said aloud in class** are the most ambiguous source, and they put the most load on working memory. Text input misses that channel.
- **New hypothesis H8:** Neurosurfers miss or misremember instructions or changes given verbally in class, and the written brief doesn't capture them. **We validate H8 on Thursday before building anything.**

## 3. Facts (checked Oct 27, 2026)

| Fact | Implication | Source |
|---|---|---|
| Consumer NotebookLM has **no public API**. The Enterprise API (Sept 2025) only reaches notebooks inside a **NotebookLM Enterprise project on Google Cloud**; personal-account notebooks can't be accessed. | A one-trigger automated pipeline is impossible without an institutional Google Cloud license. Tec runs on Microsoft (Teams is the official channel). | [Google Cloud docs](https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs), [Google AI forum](https://discuss.ai.google.dev/t/how-to-access-notebooklm-via-api/5084/6) |
| Unofficial NotebookLM automation libraries exist, but Google doesn't support them. | They break the terms of service, are fragile, and mean handling credentials. **Not acceptable.** | [notebooklm-py](https://gittrend.io/repo/win4r/notebooklm-py) |
| NotebookLM accepts audio sources and transcribes them, but **Google doesn't document speaker diarization or speaker labels**. Prompting for speakers works better on short recordings. | The "separates voices in a classroom" capability isn't guaranteed or controllable. | [Sonix](https://sonix.ai/ai/can-notebooklm-transcribe-audio/), [Substack walkthrough](https://goal17.substack.com/p/simple-ai-transcription-workflow) |
| NotebookLM output is free-form summaries. | It isn't **quote-verifiable**, which conflicts with Clara's core ("show the source, ask instead of guessing"). It would also make Clara a wrapper: judges are looking for AI that isn't "decoration", and the code review checks originality. | Handbook |
| The Claude API takes text, images, and PDFs, but not audio. | Any voice feature needs a transcription step. | SDK docs |
| Speech-to-text with diarization is now a **commodity**: AssemblyAI (~US$0.15–0.21/h, many speakers), ElevenLabs Scribe v2 batch (US$0.22/h, diarization only in batch, about 4.5 h/month free), Gemini 3.5 Transcribe (diarization ≤8 speakers, 3+ is experimental, ≤30 min with diarization), Soniox (~US$0.10/h). | Cheap and easy to integrate. Note that **all the published Spanish word error rates (WER, about 1–3%) are vendor claims on clean audio.** | [AssemblyAI pricing](https://www.assemblyai.com/pricing.md), [Scribe v2 price](https://www.llmreference.com/model/scribe-v2), [Gemini 3.5 Transcribe](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe), [Soniox comparison](https://soniox.com/compare/stt/pricing) |
| Mexican universities treat **recording a class as needing the professor's consent** (UNAM FES Zaragoza requires written acceptance; SAE requires explicit agreement; UADY says students are responsible for teachers' voice data under data-protection law). Tec's own policy is unknown. | A consent gate is required. **Ask the partner.** | [UNAM FES Z](https://www.zaragoza.unam.mx/wp-content/Portal2015/ComunicadosFesZ/Comunicado-CT-2021.pdf), [SAE](https://mexico.sae.edu/wp-content/uploads/2025/09/A03.1-Politica-de-Grabacion-de-las-actividades-de-aprendizaje-ensenanza-y-evaluacion.pdf), [UADY](https://www.ingenieria.uady.mx/media/fi-estudiantes/transparencia/Aviso_de_Privacidad_Clases_en_linea_min.pdf) |

## 4. Options compared

| Option | One-trigger by Nov 5? | Verifiable output | Privacy / consent | New failure surfaces | Fits Clara's differentiator | Verdict |
|---|---|---|---|---|---|---|
| **A.** NotebookLM via Enterprise API | ❌ Needs institutional GCP licensing | ❌ Summaries | Google tenant needed | High | ❌ Wrapper | **Reject** |
| **B.** NotebookLM via unofficial automation | ⚠️ Fragile | ❌ | ❌ ToS, credentials | Very high | ❌ | **Reject** |
| **C.** NotebookLM as a *manual* companion (student's choice; Clara output is easy to export) | n/a | n/a | Student-controlled | None | Neutral | **Roadmap line only** ("works with your study tools") |
| **D.** Speech-to-text with diarization → instructor filter → Clara decode | ✅ About 1 day | ✅ Timestamps plus replay | ✅ Keep only the instructor's speech; nothing stored | 1 vendor key, upload size | ✅ Extends "ask, don't guess" to speech | **Adopt (P1), gated on H8** |
| **E.** Paste a Teams/Zoom transcript (.vtt/.txt) | ✅ Already works by pasting | ✅ Same as text | ✅ | None | ✅ | **Adopt (zero cost)**: mention it in the UI |
| **F.** Student dictation (browser Web Speech API) | ✅ | Weak | Streams to the browser vendor | Chrome only | Low value | **Reject** |

## 5. Decision
1. **No NotebookLM integration.** What the proposal wants from it (voice separation, noise robustness, key points, organization) splits into **commodity speech-to-text with diarization**, which is cheap and has a standard API, plus **Clara's own reasoning**, which is verifiable. Building it that way keeps the one-trigger experience and keeps the IP and verifiability ours.
2. **Voice input becomes P1 "Instrucciones dichas en clase"**, only if the partner confirms H8 and recording is acceptable with the professor's permission. It's deliberately narrow:
   - The input is a clip of **≤10 min**: the moment the professor explains or changes an assignment. **Not full-lecture summaries.** That's study-tool territory and NotebookLM already does it.
   - One trigger: upload or record, then Clara produces a transcript with speakers and timestamps. Clara pre-selects the professor (the speaker with the most talk time), and the student confirms. **Other speakers' text is discarded** before anything reaches the model.
   - Clara decodes only the professor's words. **Every fact links to a timestamp the student can replay.** Numbers (dates, word counts) are always marked "confirm".
   - The **best demo moment**: compare what was **said in class** with what the **Canvas brief says**, using the existing Change Translator. For example: "In class: 1,500 words. In Canvas: not stated."
3. **Option E is already supported.** Students in online or hybrid classes can paste Teams or Zoom transcripts. We'll add one line of UI copy saying so.

## 6. How good will the text be? (expectations to verify, not promises)
- **Close mic, Spanish:** vendors report low single-digit WER.
- **Phone recording in a classroom** (far from the speaker, echo, air conditioning, students talking over each other): expect it to be **noticeably worse**. The most damaging errors are **numbers** (dates, lengths). Diarization should separate the main speaker (the professor) reasonably well, but short student questions are often merged into the professor or attributed to the wrong person.
- **Mitigations:** put the phone near the front; keep clips short; show a timestamp and replay for each fact; always confirm numbers; "ask, don't guess" stays in place; Clara never acts on its own.
- **One-hour bake-off before choosing a vendor:**
  - Test 3 real clips (with consent) on 2 vendors' free tiers: AssemblyAI and ElevenLabs Scribe.
  - Metrics: key facts captured correctly (dates, lengths, formats) out of N; % of the professor's speech attributed to the professor; latency.
  - **Decision rule:** pick the vendor with the higher key-fact accuracy. If both score below 80% on key facts, voice stays a roadmap item.

## 7. Architecture (only if adopted)
```
Browser: upload or record (MediaRecorder, mono, low bitrate, ≤10 min ≈ 2 MB)
   └─► POST /api/transcribe ─► src/lib/stt.ts  (the ONLY file that knows the vendor)
                               ◄─ segments [{speaker, start, end, text}]
UI: transcript review ─ professor speaker pre-selected (most talk time); other speakers dropped client-side
   └─► POST /api/decode  text = professor segments with [mm:ss] markers  (existing route)
UI: each fact shows "▶ 12:41" and replays that moment from the local audio (audio never leaves the browser after transcription)
Storage: none. Set the vendor's data retention to its minimum or delete after processing (check the vendor's setting).
```
- **Upload limit:** serverless hosts cap request bodies (Vercel at about 4.5 MB, to be verified). That's why clips are ≤10 min, mono, low bitrate. Longer audio would need direct browser-to-vendor upload, which adds complexity and is out of scope.
- **Cost:** about US$0.04 of speech-to-text per 10-minute clip, plus the normal Clara decode.

## 8. Schedule (if H8 is confirmed on Thursday)
| When | What |
|---|---|
| Thu evening | Ask the partner for consent policy and permission to record. Line up 3 consented clips (a teammate can role-play a professor, **labeled as a simulation** in the demo) |
| Fri Oct 30 | Bake-off (1 h), then build `/api/transcribe` and the review screen (about 1 day with AI assistance) |
| Sat Oct 31 | Run the eval on the clips. Add the "said in class vs. Canvas" demo path |
| Mon Nov 2 | Feature freeze applies. If voice isn't solid, it moves to the "What's next" slide |

## 9. Questions to add to Thursday's meeting (in `09_partner_meeting_kit.md`)
- ¿Los Neurosurfers pierden o recuerdan mal instrucciones o cambios que el profesor dice en clase y no escribe en Canvas? ¿Qué tan seguido?
- ¿Grabar un fragmento de clase (con permiso del profesor) sería aceptable para el programa? ¿Hay alguna política del Tec?
- ¿Usan transcripciones de Teams en clases híbridas o en línea?
