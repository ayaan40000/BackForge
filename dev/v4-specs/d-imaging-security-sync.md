# BackForge v4.0 — Spec D: Imaging / Security / Sync-Bridge

Owner: imaging/security/sync engineer. Scope: photo posture check, client-side vault
encryption, profile + PIN gate, Sync-with-Muse v2 + calories/weight-loss.
Extends the v3.0 bridge pattern (README "Health sync (v3.0)", `tools/health_sync.py`):
**Muse produces a file, the user imports it; the app never calls a network API.**
v4 adds the reverse leg: the app produces a *request* file, the user hands it to Muse,
Muse returns a *payload* file. Still not real-time, by design.

State: all additions are additive fields on the existing `backforge_v1` envelope
(schema bump 2 → 3, lossless migration in the v3.0 style — defaults filled, nothing dropped):

```js
// bfDefaults() additions (schema 3)
profile:  null,   // {displayName, pinRecord|null, createdAt} — §3
posture:  {captures:[], assessments:[]},   // §1 — image blobs are NOT here, see §1.3
vault:    {saltB64:null, iterations:600000, checkB64:null}, // §2 — no key, ever
syncReq:  {lastRequestId:null, lastRequestAt:null},         // §4
nutrition:{calDays:{}, goal:null},  // §4.3 — calDays merged from sync payload v2
```

---

## 1. Photo Posture Check

### 1.1 The photo set — exactly 4 views, one session

| # | View id | Subject faces | AI can judge (proxy only) | Cannot judge |
|---|---------|---------------|---------------------------|--------------|
| 1 | `side-right` | right side to camera | Anterior/posterior pelvic tilt (ASIS–PSIS line vs horizontal), forward head (ear vs shoulder plumb), thoracic kyphosis, knee hyperextension | Rotation, scoliosis |
| 2 | `side-left` | left side to camera | Same as side-right; L/R asymmetry in tilt/head carriage | — |
| 3 | `front` | camera | Shoulder height diff, head lateral tilt, pelvic obliquity (iliac crest heights), weight shift (navel vs mid-stance), knee valgus/varus | Tilt magnitude, kyphosis |
| 4 | `back` | away from camera | Shoulder/scapula asymmetry, scapular winging hint, pelvic obliquity, Achilles/calf alignment, lateral trunk shift | Tilt, forward head |

Rules that make the set assessable:

- **Stance:** barefoot, feet hip-width, toes forward, weight even, arms relaxed at sides,
  gaze at a fixed point at eye level, normal standing — explicitly *not* "standing up
  straight" (cued posture destroys the signal). One natural breath out, then capture.
- **Clothing:** fitted t-shirt/tank + shorts or leggings. No loose tops, no hoodies —
  waistband and shoulder line must be visible. Hair tied up/off the neck for side views
  (ear must be visible: it is the forward-head landmark).
- **Camera:** phone on a stable surface/tripod, lens at **waist height (~1 m)**, level
  (not tilted up/down — tilt fakes pelvic tilt), **2.5–3 m away**, portrait orientation,
  subject fills ≥80% of frame height. Same spot/distance every session (floor tape marks
  for camera + feet) so sessions are comparable.
- **Framing landmarks (must be in frame):** top of head → soles of feet, with a small
  margin. Side views: ear, shoulder tip, hip (greater trochanter), knee, ankle all visible.
- **Lighting:** bright, diffuse, in front of the subject (window/light behind the
  *camera*, never behind the subject — backlight silhouettes kill landmarks). Plain,
  uncluttered background, contrasting with clothing.
- **Optional 5th (not required, never blocks):** `side-right-flex` — side view in a
  relaxed slouch vs tall stand pair, only if the coordinator wants tilt range. Skip in v4.0.

Angles are reported as **proxies with a method note**, never as clinical measurements:
a 2-D photo cannot yield a true pelvic tilt angle. Muse returns estimated ranges
(e.g. "anterior tilt, moderate") and the app displays them as grades, not degrees,
except where a range is given with `confidence` attached (§1.5).

### 1.2 Capture guide spec (in-app, per view)

Full-screen guided flow, one view at a time, in the fixed order above. Per view:

- Ghost outline overlay (inline SVG silhouette per view, ~15% opacity) + plumb line
  (vertical centre line) + horizontal line at expected hip height.
- Instruction line, plain language, e.g. side views: *"Side-on, right side to the camera.
  Arms relaxed. Look straight ahead at the dot. Stand normally — don't straighten up."*
- Checklist that must be ticked (or auto-satisfied by retake) before "Use this photo":
  `☐ Whole body in frame, head to feet` · `☐ Camera level, at waist height` ·
  `☐ Fitted clothing, waistband visible` · side views add `☐ Ear visible (hair up)`.
- Buttons: **Take photo** / **Pick from gallery** / **Retake** / **Skip this view**
  (a set with ≥1 side view + front is assessable; missing views are recorded as
  `missing:[]` in the request and Muse grades only what it can see — skipped data
  never generates a finding, same invariant as the movement assessment).

### 1.3 Capture, normalize, store

```html
<input type="file" id="postureFile" accept="image/*" capture="environment" hidden>
```
`capture="environment"` gives camera on mobile, file picker fallback elsewhere;
"Pick from gallery" uses the same input without `capture`.

Normalize on a canvas: EXIF-rotate (via `createImageBitmap(file,{imageOrientation:'from-image'})`),
downscale to **max 1280 px long edge**, re-encode JPEG q0.82. This strips EXIF
(including GPS) — a privacy feature, state it in the UI. Typical result 150–350 KB/view.

```js
async function normalizePhoto(file){
  const bmp = await createImageBitmap(file,{imageOrientation:'from-image'});
  const scale = Math.min(1, 1280/Math.max(bmp.width,bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width*scale); cv.height = Math.round(bmp.height*scale);
  cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
  return new Promise(res=>cv.toBlob(res,'image/jpeg',0.82)); // Blob, EXIF-free
}
```

**Storage: IndexedDB, not localStorage.** Four JPEGs ≈ 1 MB ≈ 1.4 MB base64 — that
would blow the 5 MB `backforge_v1` quota shared with all app state. Store blobs in a
tiny IndexedDB store `backforge_media` / `photos` keyed by `captureId`; `S.posture.captures`
holds metadata only:

```js
// S.posture.captures entry
{id:'cap_2026-11-22_a1', date:'2026-11-22', views:{'side-right':'ph_…', 'side-left':'ph_…',
  front:'ph_…', back:'ph_…'}, missing:[], note:''}   // values = IndexedDB photo ids
```

Plaintext photos exist **only** in IndexedDB on this device. Anything that leaves the
device for the repo goes through §2 encryption first. "Delete photos" wipes both the
IndexedDB store and the metadata (mirrors v3.0's scoped "Delete synced data").

### 1.4 "Prepare for Muse" — assessment request

Button on the capture card builds one request the owner sends to Muse in chat
(copy text + attach the 4 JPEGs, or download a `.json` + the images). Images travel
**through the owner's own chat with Muse**, exactly like the v3 file handoff — the
app itself sends nothing anywhere.

```json
{
  "kind": "backforge-posture-request", "version": 1,
  "requestId": "pos_2026-11-22_01",
  "createdAt": "2026-11-22T19:40:00-05:00",
  "appContext": {
    "knownPatterns": ["extension-intolerant", "anterior-pelvic-tilt (movement test)"],
    "painToday": 3, "notes": "Right-side guarding when bending, per movement assessment"
  },
  "images": [
    {"view": "side-right", "file": "side-right.jpg", "widthPx": 960, "heightPx": 1280},
    {"view": "side-left",  "file": "side-left.jpg",  "widthPx": 960, "heightPx": 1280},
    {"view": "front",      "file": "front.jpg",      "widthPx": 960, "heightPx": 1280},
    {"view": "back",       "file": "back.jpg",       "widthPx": 960, "heightPx": 1280}
  ],
  "missing": [],
  "prompt": "Assess standing posture from these photos as SCREENING ONLY, not diagnosis. For each pattern in the result schema (pelvicTilt, forwardHead, shoulderRound, shoulderAsymmetry, pelvicObliquity, lateralShift, thoracicKyphosis) return grade clear|mild|moderate|marked|not-assessable, 1-3 short observations citing the view used, and confidence 0-1. Use not-assessable when a landmark is not visible. Do not invent measurements; estimated angle ranges are allowed only with confidence < 0.7 and a method note. Return ONLY the backforge-posture-result JSON."
}
```

`appContext.knownPatterns` comes from the latest movement-assessment findings so Muse
can corroborate or contradict them (contradiction is a finding, shown as-is).

### 1.5 Assessment result — import shape

Owner pastes/downloads Muse's reply; import validates `kind` + `version` exactly like
`importHealthSync` does, stores into `S.posture.assessments[]`, renders in a history
table next to `assessHistory`.

```json
{
  "kind": "backforge-posture-result", "version": 1,
  "requestId": "pos_2026-11-22_01",
  "assessedAt": "2026-11-22T20:05:00-05:00",
  "assessor": "Muse (vision) — screening only, not a diagnosis",
  "patterns": {
    "pelvicTilt":       {"grade":"moderate","direction":"anterior","observations":["Waistband line angles down-forward in both side views","Lower-back curve visibly deepened"],"confidence":0.65,"viewsUsed":["side-right","side-left"]},
    "forwardHead":      {"grade":"mild","observations":["Ear sits slightly ahead of shoulder plumb line, both sides"],"confidence":0.6,"viewsUsed":["side-right","side-left"]},
    "shoulderRound":    {"grade":"mild","observations":["Shoulder tips roll forward of trunk line"],"confidence":0.55,"viewsUsed":["side-right","front"]},
    "shoulderAsymmetry":{"grade":"clear","observations":["Shoulder heights even in front/back views"],"confidence":0.7,"viewsUsed":["front","back"]},
    "pelvicObliquity":  {"grade":"clear","observations":["Waistband level in front view"],"confidence":0.6,"viewsUsed":["front","back"]},
    "lateralShift":     {"grade":"mild","observations":["Trunk centre slightly right of mid-stance in front view"],"confidence":0.5,"viewsUsed":["front"]},
    "thoracicKyphosis": {"grade":"not-assessable","observations":["Upper-back curve not separable from clothing fold"],"confidence":0.2,"viewsUsed":["side-right"]}
  },
  "summary": "Moderate anterior tilt pattern matches the movement assessment; forward head and shoulder rounding mild.",
  "suggestedFocus": ["tilt-correction block", "deep neck flexor work", "pec opening"],
  "retakeAdvice": []
}
```

Grade enum is closed: `clear | mild | moderate | marked | not-assessable`.
Import rejects unknown grades/patterns (drop the pattern, keep the rest, toast what was dropped).

**Feeding the plan (conservative, mirrors the recovery-gate rule):** posture results
are *advisory inputs* to the existing findings engine, never overrides —
- `pelvicTilt.grade ∈ {moderate, marked}` + `direction:'anterior'` corroborates the
  movement-test tilt finding (raises its display confidence; does not create it alone).
- `forwardHead`/`shoulderRound` ≥ moderate adds the existing posture block emphasis.
- A posture grade may **never** remove an exercise, change a safety invariant, or
  unblock a progression. Photo screening contradicts a movement test → show both,
  movement test wins, flag "retake photos / retest in 4 weeks".

---

## 2. Client-Side Encryption — the Vault

Purpose: posture photos (and optionally full-state backups) may live in the GitHub repo
as ciphertext so they survive device loss. GitHub Pages/repo content must be assumed
**readable by anyone with repo access** — hence encrypt before anything leaves the device.

### 2.1 Construction (WebCrypto only, no libraries)

- Cipher: **AES-256-GCM**, `iv` = 12 random bytes per file, `additionalData` = the
  envelope `id` string (binds ciphertext to its filename/id).
- KDF: **PBKDF2-HMAC-SHA-256, 600,000 iterations** (OWASP 2023 floor for SHA-256),
  salt = 16 random bytes **per vault** (generated at vault setup, stored unencrypted in
  `S.vault.saltB64` — a salt is not a secret). Per-file IV is what makes each file unique;
  one vault salt + per-file IV is correct here because the key is derived once per unlock.
- Key: derived on unlock, held **in a module-scoped JS variable only** (`let vaultKey=null`),
  never in localStorage/sessionStorage/IndexedDB, zeroed (`vaultKey=null`) on lock,
  PIN-gate re-lock, and after 10 min idle. Non-extractable `CryptoKey` (`extractable:false`).
- Passphrase check without storing the passphrase: at setup, encrypt the fixed string
  `"backforge-vault-check-v1"` and store `S.vault.checkB64` ({iv, ct}); unlock = try
  decrypt, GCM tag failure = wrong passphrase. No password-equivalent verifier is stored
  beyond this (the check blob *is* a verifier — accepted, standard practice; it gives an
  offline attacker a test oracle, which is exactly why §2.4's passphrase strength matters).

```js
const PBKDF2_ITERS = 600000;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0)).buffer;

async function deriveVaultKey(passphrase, saltB64){
  const base = await crypto.subtle.importKey('raw',
    new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt:unb64(saltB64), iterations:PBKDF2_ITERS, hash:'SHA-256'},
    base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}

async function vaultEncrypt(key, id, blob){           // blob: image/jpeg Blob
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    {name:'AES-GCM', iv, additionalData:new TextEncoder().encode(id)},
    key, await blob.arrayBuffer());
  return {kind:'backforge-vault-file', version:1, id,
          alg:'AES-256-GCM', kdf:'PBKDF2-HMAC-SHA-256', iterations:PBKDF2_ITERS,
          salt: S.vault.saltB64, iv: b64(iv), ct: b64(ct),
          meta:{mediaType:'image/jpeg', createdAt:new Date().toISOString()}};
}
async function vaultDecrypt(key, env){
  const pt = await crypto.subtle.decrypt(
    {name:'AES-GCM', iv:unb64(env.iv), additionalData:new TextEncoder().encode(env.id)},
    key, unb64(env.ct));                               // throws on wrong key/tamper
  return new Blob([pt], {type:env.meta.mediaType});
}
```

### 2.2 File format & what stays unencrypted

```json
{"kind":"backforge-vault-file","version":1,"id":"cap_2026-11-22_a1_side-right",
 "alg":"AES-256-GCM","kdf":"PBKDF2-HMAC-SHA-256","iterations":600000,
 "salt":"<base64 16B>","iv":"<base64 12B>","ct":"<base64 ciphertext>",
 "meta":{"mediaType":"image/jpeg","createdAt":"2026-11-22T19:41:00-05:00"}}
```

Unencrypted on purpose (needed to decrypt, leaks nothing about content): kind, version,
alg/kdf/iterations, salt, iv. `meta` is kept to mediaType + timestamp only.
**Encrypted (inside the plaintext, prepended as JSON header before image bytes — or
simpler: encrypt the raw image bytes and keep these in `id` only):** view name is
carried in `id` — accept this (view + date is low sensitivity) **or** use opaque ids
(`vf_<random8>`) and keep the view/date mapping inside the encrypted state backup.
Recommendation: opaque ids for repo files; the mapping lives in `S.posture.captures`
locally. Filename = `<id>.enc.json`.

### 2.3 Upload flow — honest version

A static GitHub Pages app has **no GitHub credentials and must never hold a token**
(a token shipped in `index.html` is public). So the flow is manual, like everything
else in this app:

1. In-app: **Encrypt & export for vault** → downloads one `.enc.json` per photo
   (or one bundle file for the capture set).
2. Owner commits them to the repo under **`vault/`** (GitHub web upload or git),
   on a **private repo or private branch convention** — note plainly in-app:
   *"Encryption protects the content; still keep the repo private — ciphertext,
   filenames and commit dates are visible to anyone who can see the repo."*
   (Current BackForge repo is public GitHub Pages: ciphertext in a public repo is
   acceptable *only* with the strong passphrase of §2.4; UI copy must say so.)
3. Restore: owner downloads the `.enc.json`, imports it in-app, enters passphrase,
   app decrypts into IndexedDB. Muse never sees the passphrase or plaintext repo files.

### 2.4 Threat model (5 lines, ship this verbatim in-app)

> Protects: photo content if the repo, a backup file, or a downloaded export leaks.
> Does NOT protect: a device someone can unlock and open this app on while the vault is unlocked.
> Does NOT protect: a weak passphrase — ciphertext in a repo can be attacked offline, forever, at the attacker's pace.
> A 4-digit PIN as the vault passphrase would fall in seconds offline; the vault therefore requires its own passphrase (below).
> Nothing here protects against screenshots, the owner's own chat with Muse (§1 photos are sent there in the clear, by the owner's hand), or GitHub account compromise exposing that ciphertext exists.

**Mitigations built in:** separate vault passphrase with a **12-character minimum**
(setup UI shows a plain strength hint, rejects the PIN and rejects <12 chars);
600k-iteration PBKDF2 raises per-guess cost; key in memory only; auto-lock;
per-file IVs; EXIF stripped before encryption so a decrypted leak carries no GPS.

---

## 3. Profile + PIN Gate

### 3.1 Design

- **First run (v4.0):** if `S.profile` is null → setup sheet: display name (prefills
  exports/requests), set a **4-digit PIN**, confirm it. The owner's actual PIN is set
  by the owner here — **no PIN value appears anywhere in shipped code, this spec's
  code, defaults, or test fixtures.** There is no default PIN and no backdoor/reset:
  forgotten PIN = "Reset app lock" option that keeps data but requires re-setting a PIN
  *only after* a full state export is offered (a local gate cannot distinguish owner
  from holder-of-phone; pretending otherwise would be dishonest — see disclaimer).
- **Storage:** never the PIN, never a reversible form. Salted slow hash:

```js
// S.profile.pinRecord
{"algo":"PBKDF2-HMAC-SHA-256","iterations":310000,"saltB64":"<16B random>",
 "hashB64":"<32B>","setAt":"2026-11-22T19:30:00-05:00"}
```
(310k iterations ≈ 100–200 ms on a phone — enough friction per guess for an *online,
in-app* gate where §3.2 backoff dominates; the vault keeps its own 600k + strong passphrase.)

```js
async function hashPin(pin, saltB64, iters){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode('bf-pin:'+pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt:unb64(saltB64), iterations:iters, hash:'SHA-256'}, base, 256);
  return b64(bits);
}
// verify: recompute, compare with a constant-time-ish loop over the base64 strings.
```

- **Gate behaviour:** app boots to a PIN pad when a `pinRecord` exists; content renders
  only after unlock. Gate state is a JS boolean, not stored (reload = locked).
  "Skip PIN" is **not** offered. Turning the PIN off later requires entering it.
- **Change PIN:** More → Profile → enter current PIN → set new → re-hash with a
  **fresh salt**. Also invalidates nothing else (PIN encrypts nothing — see §3.3).

### 3.2 Lockout / backoff (in `S.profile.lock`, persisted so reload doesn't reset it)

```js
{"fails":0,"lockedUntil":null}
```
3 fails → 30 s lock · 5 fails → 5 min · 8 fails → 30 min · then +30 min per further
fail (cap 2 h). PIN pad disabled while `lockedUntil > now`, showing remaining time.
Successful entry resets `fails` to 0. This stops casual shoulder-surfing retries;
it does not stop someone extracting `backforge_v1` from the device and attacking the
hash offline (4 digits = 10,000 combos — minutes). Hence §3.3's disclaimer and §3.4.

### 3.3 In-app disclaimer (one line, shown at PIN setup and on the lock screen)

> "This PIN is a privacy screen for this device — it is not encryption and does not protect your data from anyone who has your phone or its backups."

### 3.4 PIN vs vault passphrase — recommendation: **different secrets, deliberately**

- **PIN (4 digits)** = convenience gate for opening the app. Weak by design, attacked
  online with backoff. It encrypts nothing.
- **Vault passphrase (≥12 chars)** = the actual cryptographic secret for repo files,
  attacked *offline* with no backoff possible.
- Same secret would mean the weakest use (typed daily, shoulder-surfable, 10k space)
  becomes the key to the strongest store. **Never derive the vault key from the PIN.**
- UX bridge allowed: after PIN unlock, the app may *offer* to prompt for the vault
  passphrase (vault unlock is a separate, explicit action with its own lock state).

---

## 4. Sync-with-Muse v2 + Calories / Weight-Loss

### 4.1 The request leg (new in v4)

**Progress → Sync with Muse** card (replaces the v3 "ask in chat" instruction) with
two buttons: **Request health sync** / **Request calorie sync**. Each builds a small
JSON the owner copies/downloads and pastes to Muse in chat; the app records
`S.syncReq` so a stale or mismatched reply can be flagged (`inReplyTo` check on import).

```json
{"kind":"backforge-sync-request","version":2,
 "requestId":"sync_2026-11-22_01","type":"health",
 "createdAt":"2026-11-22T19:45:00-05:00",
 "windowDays":28,
 "want":["steps","zone2","sleep","weight"]}
```
```json
{"kind":"backforge-sync-request","version":2,
 "requestId":"sync_2026-11-22_02","type":"calories",
 "createdAt":"2026-11-22T19:46:00-05:00",
 "windowDays":28,
 "want":["caloriesIn","caloriesOut","weight"],
 "context":{"bodyweightKg":86.2,"proteinTargetG":138,
   "note":"caloriesIn only from sources Muse can actually read; null where unknown — never estimate silently"}}
```

Muse's side: `tools/health_sync.py` gains a `--type calories` mode / a sibling
generator producing payload v2 (below). Muse answers a request only with data from
connected sources it can name in `sources[]`; anything unavailable is `null` +
a `coverage.note`, following the v1 honesty rules (null ≠ 0, sparse weight stays sparse).

### 4.2 Payload v2 — additions only

`kind:'backforge-health-sync', version:2`. v4 importer accepts v1 and v2; v2 days are
v1 days **plus** two nullable fields, and one new top-level block. Merge rule unchanged:
by date, into `S.health.days[date]` (now also storing the two new fields) and
`S.nutrition.calDays[date]`; re-import refreshes overlap; import stays read-only
w.r.t. check-ins/log/plan; Pause/Delete semantics unchanged and now also cover calories.

```json
{"kind":"backforge-health-sync","version":2,
 "inReplyTo":"sync_2026-11-22_02",
 "generatedAt":"2026-11-22T20:10:00-05:00",
 "source":"Health Connect + Muse estimate, via Muse",
 "window":{"from":"2026-10-26","to":"2026-11-22"},
 "zone2":{"hrMin":110,"hrMax":129,"basis":"60-70% of estimated HRmax 184 (220-age)","method":"…as v1…"},
 "coverage":{"complete":false,"note":"caloriesIn available 9 of 28 days (food-log source gaps); caloriesOut from watch active+resting estimates where present."},
 "calories":{"method":"caloriesOut = watch-reported total energy where available, else null. caloriesIn = logged food totals where available, else null. Neither is measured; both are estimates with wide error bars.",
   "sources":["Health Connect (energy)","food log export"]},
 "days":[{"date":"2026-11-21","steps":8123,"zone2Min":32,"sleepMin":431,
   "sleepDeepMin":74,"sleepScore":81,"weightKg":86.2,
   "caloriesIn":2140,"caloriesOut":2610}]}
```

Validation: reject wrong `kind`; accept `version` 1|2; per-day, non-numeric or
negative calorie values are dropped to `null` (never imported as 0).

### 4.3 Charts (existing style, no new renderer)

Reuse `drawChart(id,data,color,labels,fixedMax)` verbatim — 520×170 canvas,
`class="chart"`, grid `#262C37`, labels `date.slice(5)`. One-line extension only:
add `'stepsChart'|'zone2Chart'|'sleepChart'|'calChart'` to the line-chart id list
(currently `painChart|weightChart|waistChart`) so they render as lines+dots instead
of bars; weight chart already exists. New card "Trends — synced" on Progress:

| Chart | Data | Colour (existing palette) |
|---|---|---|
| Weight (kg) | existing `weightChart` | `#7DD3FC` |
| Steps / day | `health.days[].steps`, last 28, nulls skipped (compress, note "days with data only") | `#C8F04B` |
| Zone 2 (min/day) | `health.days[].zone2Min` | `#B79CFF` |
| Sleep (h) | `sleepMin/60`, 1 decimal | `#F0B24A` |
| Calories in vs out | two `drawChart` passes on one canvas is **not** supported — render two small charts, or in/out as one chart of `caloriesOut-caloriesIn` (deficit) bars via default bar path. Ship the deficit-bar version; label it "estimated daily balance". | `#FF6B4A` |

Null handling matches v3: charts plot only days with data; empty state uses the
existing "No data yet" path. No chart may imply precision the source lacks —
sleep/calorie cards carry the payload's `coverage.note` under them.

### 4.4 Weight-loss + posture plan card ("Body plan" card, Progress tab)

Combines both goals in one card; posture work is never traded away for the deficit.

**TDEE estimate (from synced data, stated on the card):**
```
BMR (Mifflin–St Jeor, male) = 10·kg + 6.25·cm − 5·age + 5     // height/age from profile setup; if absent, card asks for them and shows nothing numeric until given
Activity factor from synced steps (last 14 d avg):  <4k → 1.30 · 4–7k → 1.40 · 7–10k → 1.50 · >10k → 1.60   // steps already include Zone 2 days; do NOT add exercise calories on top (double-count)
TDEE ≈ BMR × factor
Cross-check (preferred when ≥14 d of both exist): TDEE ≈ avg caloriesIn − (Δweight kg × 7700 / days)   // energy-balance back-solve; show this one and label the formula one "starting estimate"
```
Honesty limits printed on the card: *"TDEE here is an estimate from watch/scale data —
error is easily ±200–300 kcal/day. The 2-week weight trend outranks the formula:
if weight isn't moving at the target, adjust by 100 kcal and re-check in 2 weeks."*
Watch calorie-out figures are treated as ±20% at best; if `caloriesOut` coverage is
better than the step-based factor for ≥14 days, prefer the back-solve cross-check.

**Targets (gentle, capped):**
- Deficit: **TDEE − 300 kcal** (floor: never below BMR, never below 1,500 kcal target),
  expected pace ≈ 0.25–0.4 kg/week. No larger deficit is offered in-app.
- Protein floor: **unchanged, existing rule** — `proteinTarget()` = 1.6 g/kg at
  current bodyweight, tracked by the existing protein card; on the Body plan card it
  is shown as the *first* nutrition rule ("hit protein, then the calorie target").
- Guardrail: if 14-day avg pain ≥ 5 or a flare protocol ran ≥3 days in 14, the card
  switches the deficit line to *"Hold calories at maintenance until pain settles —
  rebuilding tissue in a deficit during a flare is a bad trade."* (display only;
  it never edits the plan's exercises).

**How the two goals combine (copy + logic):**
- Posture/back plan (assessment → findings → A/B/C + foundation blocks) is **unchanged**
  and remains the primary plan; weight loss rides alongside as: protein floor +
  calorie target + the already-tracked steps/Zone 2 (Zone 2 doubles as the deficit's
  activity engine — no extra cardio is prescribed).
- Card shows one combined weekly line: sessions ✓/✗ · protein days ✓/✗ · avg steps ·
  weight Δ (from the existing trend logic) — each with the v3-style honest verdict.
- **No medical claims:** card footer, verbatim: *"General information, not medical
  advice. This app screens movement patterns; it does not diagnose. Talk to your
  doctor before a calorie deficit if you have any medical condition, and stop and
  seek care for red-flag symptoms (the assessment lists them)."* No disease,
  treatment, or guaranteed-outcome language anywhere in the card.

### 4.5 Sync-request lifecycle (state)

```js
// S.syncReq after a fulfilled import
{"lastRequestId":"sync_2026-11-22_02","lastRequestAt":"2026-11-22",
 "fulfilledBy":"backforge-health-sync v2 @2026-11-22T20:10:00-05:00"}
```
Import with an `inReplyTo` that doesn't match `lastRequestId` still imports
(data is data) but toasts *"This payload wasn't made for your latest request — imported anyway."*

---

## 5. Acceptance checks for the coordinator

1. Migration: seeded schema-2 state loads losslessly; new fields default; premigration copy kept (extend `dev/harness-v3.mjs`).
2. Posture: capture set with a skipped view imports/exports with `missing:[]` correct; result import rejects an unknown grade and keeps valid patterns; posture result alone creates **no** plan change.
3. Vault: encrypt→export→fresh-browser import→decrypt round-trip returns byte-identical JPEG; wrong passphrase fails cleanly (GCM throw → "wrong passphrase" toast, no partial write); grep shipped `index.html` for the PIN value and any passphrase — must be absent.
4. PIN: 3/5/8-fail backoff survives reload; change-PIN re-salts; disclaimer string present verbatim at setup.
5. Sync v2: v1 sample payload (`tools/sample-payload/`) still imports; v2 payload merges calories without touching check-ins/log; deficit chart renders with 9-of-28-day calorie coverage and shows the coverage note.
6. Safety invariants untouched: no loaded flexion/twisting, extension-intolerant removals, pain ≥ 7 relief-only — posture/calorie features must not reach the exercise-selection code paths.
