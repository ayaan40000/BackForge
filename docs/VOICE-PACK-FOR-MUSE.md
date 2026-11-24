# Task for Muse: record the Live coach voice pack

**Repo:** `ayaan40000/BackForge` · **Owner:** Ayaan · **Status:** open · **Pack id to create:** `coach_nova`

The Live coach currently uses a synthetic voice that the owner finds robotic. Produce a pre-rendered voice pack, one audio file per sentence the coach can say, in an **energetic female personal-trainer voice** (spec in §2). The app already plays packs; you only add files and a registry entry. **No code changes are needed.**

---

## 1. What to deliver (checklist)

1. A folder `app/voice/coach_nova/` with one audio file per sentence in `data/voice-corpus.json`, named `<id>.<ext>`. Example: the sentence with id `e34d75183ea2` is `e34d75183ea2.mp3`.
2. Run `node tools/voice_pack.mjs app/voice/coach_nova` to build `manifest.json` and check coverage. It must report **100%**. Anything missing is written to `app/voice/coach_nova/missing.csv`.
3. Register the pack in `app/voice/index.json`: add `{ "id": "coach_nova", "label": "Nova — energetic coach" }` to `packs` and set `"default": "coach_nova"`. Keep the existing `af_heart` entry as a fallback.
4. Run `npm test`. The voice test warns if the pack you set as default is incomplete.
5. Commit on a branch `muse/voice-pack-nova` with the message `data: coach voice pack "Nova" (N clips)`, push, and tell Ayaan. Do not edit anything under `app/js/`, `app/css/` or the engine.

## 2. The voice: "Nova", an energetic female personal trainer

| Trait | Direction |
|---|---|
| Who | A female personal trainer in her late 20s to mid 30s who also knows rehab: upbeat, confident, warm. She sounds like she's in the room with you, not reading. |
| Energy | **High but controlled.** Bright and forward, with a smile in the voice. Pushes you on effort lines, drops to calm for breathing and safety. Never shouty, squeaky, salesy or "radio DJ". |
| Pace | About 165–180 words per minute on coaching lines, 120–140 on breathing and calm lines. Clean starts, no long lead-in breaths. |
| Pitch and tone | Mid-range female pitch with natural variation; ends sentences going **down** (confident), not up. No vocal fry, no breathy whisper, no exaggerated cheerleader pitch jumps. |
| Accent | **General American** (neutral, clearly articulated). Keep one accent across every clip. |
| Diction | Crisp consonants. Numbers are spoken naturally: "8 reps each side, three sets" is read "eight reps each side, three sets". |
| Personality | Encouraging without hype. Specific, never sarcastic. She believes you can do it and says so briefly. |
| Avoid | Robotic flatness; sing-song delivery; laughing; sighs; music or room reverb; any background noise. |

**Reference feel:** a premium connected-fitness class instructor (Peloton / Apple Fitness+ style energy), with a physiotherapist's calm on safety lines. This describes a feel; don't imitate any real person's voice.

### 2.1 Delivery by `style` (every corpus item has one)

| style | Share of lines | How to say it | Examples |
|---|---|---|---|
| `energetic` | ~1,500 | Bright, punchy, forward. A lift on key words. Counting and the last reps get the most drive. | "Last one." · "Halfway. Nice work." · "Hey Ayaan. Good to see you." · "First up: Bird-Dog." |
| `coaching` | ~3,500 | Clear, confident, mid-energy. A trainer explaining a cue while you move: easy to follow, never rushed. | "Hands under shoulders, knees under hips." · "Focus: reach long, not high." · "8 reps each side, three sets." |
| `calm` | ~80 | Slower, softer, lower. Lets the heart rate settle. Pauses at commas. | "Breathe in through your nose, out through your mouth." · "Cool-down. Slow everything down now." |
| `safety` | ~175 | Calm, serious, unmistakably clear. No smile, no rush, every word distinct. | "Sharp, burning or tingling — tap Pain." · "Stop that move. We'll skip it today." |

Each sentence is its own file, and the app plays files back to back with a short gap. So every clip must sound complete on its own: no trailing "and…", and a natural falling end.

## 3. Audio spec (exact)

| Property | Value |
|---|---|
| Format | **MP3** (preferred) or M4A/AAC. Mono. |
| Sample rate / bitrate | 24 kHz or 44.1 kHz; MP3 64 kbps CBR, or AAC 48 kbps. |
| Loudness | **−16 LUFS integrated** per clip (±1), true peak ≤ **−1.5 dBTP**. All clips must sound equally loud. |
| Silence | Trim to **≤ 50 ms** at the start and **≤ 120 ms** at the end. No clicks or pops at the cut. |
| Length | Usually 0.4–8 s. Anything under 0.15 s or over 30 s is rejected by the checker. |
| Naming | `<id>.mp3`, using the `id` from the corpus exactly (12 hex characters). |
| Text | Say **exactly** the `text` field. Don't add, drop or reorder words, because captions show the same text. Pronunciation help is below. |

### 3.1 Pronunciation (also in `data/voice-pronounce.json`)

- "90/90" → "ninety-ninety" · "360°" → "three-sixty" · "°" → "degrees" · "&" → "and" · "×" → "by"
- "IR" / "Hip IR" → "internal rotation" / "hip internal rotation"
- "McGill" → "mc-GILL" · "Pallof" → "PAL-off" · "QL" → "Q-L" · "TFL" → "T-F-L"
- "Y-T-W" → "Y, T, W" · "/ side" → "per side" · "Ayaan" → "Ah-YAHN"
- Exercise names with a hyphen ("Bird-Dog", "Cat-Camel") are read as two words, without spelling out the hyphen.
- Single number words ("two", "three"…) are rep counts: short, punchy, on the beat.

## 4. The script: what to record

- **`data/voice-corpus.json`**: `{ count, items: [{ id, text, category, style }] }`. Currently **5,303 sentences**, about 2 hours of audio.
- **`data/voice-corpus.csv`**: the same rows (`id,style,category,text`), ready for batch TTS tools.
- The list is generated from the app's actual coach logic (`tools/voice_corpus.mjs`), so it covers 100% of what a session can say: greetings for "Ayaan", every exercise name, dose, setup and focus cue, counts, rests, safety lines and cool-downs.
- **Regenerate before you start**, in case lines changed: `node tools/voice_corpus.mjs --write`. IDs are a hash of the text, so unchanged sentences keep their IDs. When the corpus changes later, you only record the new IDs, and the checker lists them in `missing.csv`.

## 5. How to produce it

Use any method that gives a natural, consistent human-sounding voice **that you have the right to use in this app**: a high-quality neural TTS with style control, or a human voice actor. Requirements:
- **One voice for the whole pack.** Same settings and same loudness target for every clip.
- If the TTS supports style or emotion instructions, map them to `style` (§2.1): e.g. energetic = "upbeat, motivating trainer"; coaching = "clear, friendly instruction"; calm = "slow, soothing, relaxed"; safety = "calm, serious, clear".
- Batch by `style` so each group gets its own direction.
- Spot-listen to at least 40 random clips per style before the full run. Fix the direction once, then render everything.
- Post-process every file: trim (§3), loudness-normalise to −16 LUFS (for example `ffmpeg -af loudnorm=I=-16:TP=-1.5:LRA=7`), then encode (§3).

## 6. Check it before you hand it back

1. `node tools/voice_pack.mjs app/voice/coach_nova` → `coach_nova: 5303/5303 sentences (100.0%)`.
2. `npm test` → all pass.
3. Serve the repo (`npm run serve`), open `http://localhost:8765/#/you`, choose **Nova** under Coach voice, and tap **Sound check**. You should hear a beep, then "First up: Bird-Dog. Hands under shoulders, knees under hips. Focus: reach long, not high." in the new voice.
4. Start a 5-minute session in Live and listen to the intro, one brief, a countdown, a rest and the close. The lines should flow, with no gaps over half a second and no loudness jumps.
5. Report to Ayaan: the pack id, the clip count, the total size, how it was made (engine/voice, or actor), and anything you were unsure about.

## 7. Size

About 2 hours of speech at 64 kbps mono is roughly 55–60 MB. That's fine: the app downloads only the clips a session needs (about 1–2 MB) and keeps them for offline use.
