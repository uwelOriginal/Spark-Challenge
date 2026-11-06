# 13: Cost and Model Routing (Oct 27, late night)

**Goal set by the team:** keep the demo and MVP as cheap as possible.
**Result:** with a free Groq key, nearly every call costs **US$0**. Anthropic is called only when the free tier is rate-limited, fails, or gives an answer that fails Clara's own quote check. ElevenLabs is now optional and off by default.

## 1. "Why ElevenLabs, if Chatterbox and Voice Studio are free?"
- **Chatterbox (Resemble AI) is text-to-speech**: it turns text into a voice. Clara's audio feature needs the opposite, **speech-to-text** with timestamps (what the professor said, and when), plus some way to separate the professor from other voices. Chatterbox doesn't do that.
- If "Voice Studio" means a voice-generation tool, the same applies. If you meant a transcription tool, tell me which one and I'll compare it.
- **What we use now: Groq Whisper large v3.**
  - Free tier, 25 MB per file.
  - Groq lists a 10.3% word error rate; the paid rate would be $0.111 per audio hour.
  - Whisper doesn't separate speakers, so a cheap LLM pass labels each segment as *professor* or *other* from its content. The student always reviews this, and the UI says so plainly.
- **ElevenLabs Scribe stays optional**, only if someone adds a key, because it separates speakers by how they *sound*, which is more reliable in a noisy classroom. It's not required, and it costs nothing unless enabled.
- **Reading aloud** (useful for dyslexia and ADHD) uses the **browser's built-in voice** (Web Speech API): free, works offline, no server. The "Escuchar" button is on the summary and the next step. Self-hosting Chatterbox in Docker would only make sense for a nicer voice, and it would need a server we'd have to pay for and keep running.

## 2. Routing policy (`clara/src/lib/llm.ts`)

| Task | 1st (free) | Escalation (paid, only if needed) | Quality check before accepting the free answer |
|---|---|---|---|
| Decode an assignment | Groq `openai/gpt-oss-120b`, strict JSON schema | Anthropic `claude-sonnet-5-5` (the team's setting) | ≥ 85% of quotes found word for word in the sources |
| Chat | Groq `gpt-oss-120b` | Anthropic | Every citation found in its source |
| What changed | Groq `gpt-oss-120b` | Anthropic | ≥ 80% of change quotes found |
| Label speakers (audio) | Groq `gpt-oss-120b` | Anthropic | Schema only |
| Read a photo of a brief | Groq `qwen/qwen3.8-27b` (vision) | Anthropic | Not empty |
| Read a scanned PDF | - (Groq doesn't read PDFs) | Anthropic | - |
| PDF with a text layer | Local `unpdf` (no AI, $0) | - | - |
| Class audio → text | Groq Whisper large v3 | ElevenLabs (optional) | - |

- `CLARA_ROUTE=groq` → **free only.** If Groq is rate-limited, the user sees "intenta en un minuto" instead of being charged.
- `CLARA_ROUTE=groq,anthropic` (default) → free first, paid only on escalation. **Recommended for demo day**, so a rate limit never breaks the live pitch.
- Every call logs which provider served it (`[clara-route] decode groq …`), never the content. `npm run eval` reports the share of calls served by the free tier.
- If no answer passes the quality check, the router returns the best one that parsed. The UI still marks every unverified quote with "!", so nothing unverified is presented as verified.

## 2b. Whole-class audio (2–6 h): orchestrator (`clara/src/lib/jobs.ts`)
Groq's free tier accepts at most **25 MB per file**. A 1.5-hour recording is about 45 MB, so it was rejected. Long recordings now go through a background job:

1. **Split.** ffmpeg (bundled through `ffmpeg-static`) cuts **10-minute parts with 5 s of overlap**, as 16 kHz mono FLAC (the format Whisper uses internally, and lossless). Each part is well under 25 MB.
2. **Transcribe in parallel.** At most 3 parts at once (`CLARA_STT_CONCURRENCY`). If Groq rate-limits a model, the job **switches between `whisper-large-v3` and `whisper-large-v3-turbo`**, which have separate limits. When both are limited, it **waits as long as Groq's `retry-after` header says and resumes**. The UI shows "Clara sigue sola a las HH:MM".
3. **Merge.** Segments are re-timed to the whole class (`[1:05:30]`), and the overlap is dropped.
4. **Extract (map step).** For each part, a cheap model copies **only the coursework passages** (due dates, deliverables, format, grading, exams, changes). Each passage is **checked word for word against its part**, then duplicates are removed. Extraction switches between `gpt-oss-120b` and `gpt-oss-20b` in the same way.
5. **Review, then decode (reduce step).** The student sees the passages with their times, unticks any that are wrong, and adds them as the "Lo dicho en clase" source. The full transcript can be downloaded as `.txt`. Clara then decodes a few hundred words instead of 60,000, which keeps it on the free tier.

**Measured (synthetic 1:05:50 class, 30.1 MB MP3, real Groq free tier, Oct 28):**
- Transcription of 7 parts: about 45 s.
- **Upload to passages: 53 s. Full UI flow including decode: 66 s.** No page errors.
- 5 passages found. The essay instructions at 05:06–05:26 and the exam at 1:03:06 were both found, all quotes verified.
- The decode was served by Groq (free), with 4/4 quotes verified. The exam became its own date (decode-v2.1).
- Before the model switching, extraction waited on rate limits and took 148 s.

**Projection for 6 h (36 parts), not measured:**
- Without hitting the free tier's hourly audio limit: about 5–8 minutes.
- The free tier's **audio-seconds-per-hour and per-day limits** (shown in your Groq console) can make a 6-hour class take longer. The job waits and resumes on its own, so nothing fails.
- If speed matters, Groq's paid Developer tier costs **$0.04/h (turbo) to $0.111/h (large v3)**, so **a 6-hour class costs about $0.24–0.67**.

**Deployment constraint:** jobs need a **long-running Node server**: local, Docker (`clara/Dockerfile`), or a container host such as Render, Fly or Railway. Serverless hosts like Vercel can't take a ~300 MB upload or keep a multi-minute job alive. The rest of the app runs anywhere.

**Whisper accuracy:** on synthetic audio, Whisper misheard "en Canvas" as "en cambios". The student-review step and "ask, don't guess" cover this, but real classroom audio is still untested.

## 3. What a demo costs

| Scenario | Cost |
|---|---|
| Groq free tier serves everything (expected) | **US$0** |
| A decode escalated to Sonnet 5.5 (~3k input + ~3k output tokens at $2/$10 per million) | ~US$0.04 |
| Worst case: a full demo day of 50 decodes plus 50 chats, all escalated | ~US$3–4 |
| Hosting (Vercel hobby), no database, no auth | US$0 |
| Speech-to-text (Groq free tier) | US$0 |
| Read aloud (browser) | US$0 |

**Safety:** set a **spend limit in the Anthropic console** (e.g. US$5) and keep `CLARA_ACCESS_CODE` on any public URL.

## 4. Business model impact
- **MVP and pilot:** the free tier covers the challenge and a small pilot.
- **At scale:** Groq's paid rates for open models plus Whisper at $0.111/hour keep variable cost well under the US$0.67 per student per month estimated in doc 06. **Verify current Groq pricing before quoting numbers in the pitch.**
- **The routing itself is a pitch point:** it's "responsible AI and cost discipline", because a cheap model is accepted only when its quotes can be verified.

## 5. Open
- **Needs `GROQ_API_KEY` in `clara/.env`** (free at console.groq.com). Until then, the router falls back to Anthropic only, as before.
- Groq's exact free-tier limits (requests per day, tokens per minute, audio seconds per hour) are shown in your Groq console. The docs page renders them only after login.
- Groq data handling: check Groq's "Your Data" policy before using it with real partner material.
- Whisper plus content-based speaker labels hasn't been tested on real classroom audio yet. That bake-off is still pending (doc 10).
