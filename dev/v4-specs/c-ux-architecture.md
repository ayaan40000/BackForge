# BackForge v4.0 — UX / App Architecture Spec (C)

Status: implementation-ready. Target: `index.html` (single file, vanilla JS, no build step, state in `localStorage` key `backforge_v1`).
Owner complaint this spec answers: *"too much scrolling, too much text — MAKE IT AN APP."*
Rule zero for every screen below: **one phone viewport, at most a short scroll (≤ ~1.5 viewports), cards not text walls, one primary action.**

Current state audited (v3.0, 159 KB): views `today / live / assess / library / progress / more`, 6 bottom-nav items (over the 5-tab limit), desktop top tabs mirror them. Today stacks hero + 4 KPIs + session + check-in + coach + week grid + embedded video; Live stacks quote + habit + desk + builder + plan + coach notes; Progress stacks 9 sections; More is a junk drawer (reminder, roadmap cards, references, safety paragraph). All long copy already exists in JS/data — v4 moves it behind sheets, it does not rewrite the engines (assessment, plan, Live builder, readiness, gate, health sync all stay as-is).

---

## 1. App shell

### 1.1 Tab bar — 5 tabs, no more

| # | Tab | Icon* | Contains | Replaces |
|---|-----|-------|----------|----------|
| 1 | **Home** | house | Check-in, today's session, streak/readiness glance | `today` (slimmed) |
| 2 | **Train** | play | Live builder + defaults, desk-day defense, week strip | `live` (slimmed) |
| 3 | **Posture** | person-standing | Daily posture cues, band posture assessment + grades, photo posture check, full 13-test movement assessment | `assess` + NEW |
| 4 | **Moves** | dumbbell / grid | Exercise database (48 canonical, superset of in-app 26), search/filter, video popup | `library` (expanded) |
| 5 | **Progress** | chart | Pain/sessions charts, health-sync charts, weight + calories plan, gate, weekly review | `progress` (slimmed) |

\* Icons: inline SVG, `currentColor`, no emoji (current bottom nav uses emoji glyphs — replace; emoji render inconsistently and read as "web page", not app).

**Profile is not a tab.** Header avatar button (initials/photo, top-right, ≥44px) opens the **Profile** screen (§2.7). This is the Apple Fitness+ / AYU pattern: identity lives in the header, tabs stay task-only. Desktop (≥820px): same 5 items as top tabs in the existing sticky header + avatar at right; bottom nav hidden (as today). Streak pill leaves the header (moves to Home card C1) — header is logo + tabs + avatar only.

### 1.2 Screen model

- **Screens** = the 5 tab views + Profile. One `.view` section each, `go(v)` unchanged in spirit; rename ids: `view-home, view-train, view-posture, view-moves, view-progress, view-profile`.
- **Flows** (assessment wizard, photo check, PIN setup) = full-screen overlays, step-at-a-time, own back/close, never tab content.
- **Sheets** = bottom sheet on mobile / centred dialog ≥720px — reuse existing `.overlay`/`.sheet` exactly. All detail, all long text, all video lives in sheets. Nothing informational is ever a screen.
- **Player** = full-screen overlay (§4), unchanged concept.
- **Viewport budget (acceptance test):** at 390×844, each tab screen's *default state* fits with ≤ 1 short scroll; no screen may exceed ~1.5 viewports before a "more" affordance (sheet/segment/flow) takes over. Collapsed/empty states must fit in 1 viewport.
- **Segmented control pattern** for multi-topic screens (Posture, Progress): a sticky 44px segmented row switches panels *in place* — panels are not stacked vertically. This is the single biggest scroll-killer in this spec.

### 1.3 Where every feature lives

Existing: Today→Home · Live player→Train (overlay) · Assess→Posture flow · Library→Moves · Progress→Progress · More→Profile (§5).
New v4.0: Posture cues (daily)→Posture/Home chip · Band posture assessment + grades→Posture · Exercise DB + video popup→Moves · Work/Travel mode→Profile toggle + Home/Train banner chip · Photo posture check→Posture flow · Weight tracking→Progress (Weight segment) · PIN/profile gate→app entry (§2.1) · Sync-with-Muse + health charts→Progress (Health segment) · Calories & weight-loss plan card→Progress (Weight segment).

---

## 2. Screens — wireframe in words

Content caps are hard: a card shows at most the lines stated. Anything beyond → its sheet ("Why?" pattern, §4.3).

### 2.1 PIN gate (pre-shell overlay, shown before any view)

Borrowed from AYU Studio (§6.1). Shown on cold start if a PIN is set; skipped entirely if not set (first run offers setup, dismissible, in Profile too).

- Full-screen `--bg`, centred column, max-width 320px.
- Logo mark + "BackForge" (Space Grotesk 22px), profile name under it ("Ayaan" — from `S.profile.name`).
- 4 PIN dots (filled/unfilled, 16px, `--volt` fill). Error: dots shake (respect `prefers-reduced-motion`: no shake, red `--bad` flash instead) + one line "Wrong PIN — try again".
- Numeric keypad: 3×4 grid, keys ≥64px, digits + blank + delete. No keyboard input needed; also accept physical keyboard on desktop.
- After 5 wrong attempts: 30s lockout line with countdown (local only — this is a privacy gate, not security theatre; copy must say "Keeps your data private on a shared device", never claim encryption).
- **Primary action: entering the 4th digit** (auto-submit, no button). Secondary text-button (44px): "Forgot? Erase app data" → confirm sheet → wipes `backforge_v1`.
- Success → fade to last-active tab (persist `S.ui.lastTab`), default Home.
- PIN stored as salted hash only (`S.profile.pinHash`, SHA-256 via `crypto.subtle`, salt = random per profile, stored alongside). Never plaintext, never in exports marked as credential — export includes the hash field name only with value stripped.

### 2.2 Home (Today)

Order top→bottom. Primary action: **Save check-in** (until saved; then **Start today's session**).

| Card | Shows (max) | Action |
|------|-------------|--------|
| C1 Status strip (not a card — one row) | Streak flame + n · week dots (Mon–Sun, existing `.weekdots`, compact) · mode chip if Work/Travel on ("✈ Travel") | Chip → Profile mode toggle sheet |
| C2 Check-in | Pain slider 0–10 with live number; Where? segmented row (5 chips, existing options); Slept segmented row (3 chips). Nothing else — the v3 explanatory paragraph is deleted | **Save check-in & tune today** (primary, full-width, sticky bottom of card) |
| C3 Today | Session title + est. mins + load verdict from check-in/readiness (1 line, e.g. "Full, minus top set — poor sleep"); readiness score as a ring or big number + 1-line verdict; exercise list capped at 4 rows (thumb, name, dose) + "+3 more" row | **Start** (primary) → player. "+3 more"/card tap → session sheet (full list + Why receipt) |
| C4 Posture cue of the day | 1 cue (icon, name, 1-line instruction, dose) — same cue as Posture P1, done-state shared | **Done** (one tap, 44px) / tap card → Posture tab |
| C5 (conditional, max 1 at a time) | Priority order: flare protocol banner (pain ≥7) › streak-repair offer › deload proposal › sync-stale nudge (>7 days) › backup-due nudge. 2 lines + 1 button | Contextual single button |

Deleted from Home: hero headline/lede, 4-KPI row, "Your week" grid, Big-3 video card, all `sec-sub` paragraphs (§5). Done-state: C2 collapses to one line "Checked in · Pain 4 · Slept okay ✓" with Edit text-button; C3 primary becomes Start. "Already in the bank" line stays as C3 sub-line when a session is logged.

### 2.3 Train (Live)

Primary action: **Build it & start**.

| Card | Shows (max) | Action |
|------|-------------|--------|
| T1 Builder | Time row (5 big buttons, existing `.bigtime`: 5/10/20/35/50); Feel segmented (Great/Okay/Low/Flare); Caveats chips (6, existing) — collapsed to one row + "More options" if space is tight, defaults pre-selected from readiness/check-in as today | **▶ Build it & start — no more decisions** (primary, sticky start bar as existing `.startbar`) |
| T2 Today's default | Session title, est., 3 exercise rows + "+n", 1-line "why" | Tap → "Why this workout?" sheet (full receipt, existing reasons list) |
| T3 Desk-day defense (conditional: desk day detected/declared, or always as a slim row) | 1 line + duration (5 min) | **Start block** → player |
| T4 Week strip | 7 day cells (A/cardio/B/cardio/C/cardio/rest, done state) — replaces Home's old week grid and Live's habit card | Tap a day → sheet with that day's plan summary (read-only) |

Deleted from Train: quote card (moves to player finish screen + one rotating line allowed as T1 sub-line, ≤1 line), habit card (week dots → Home C1; badges → Progress), coach-notes card (→ "Why?" sheet from T2; the mechanics also surface as player/finish copy). Travel/Work mode effect here: builder defaults flip to no-band + quiet caveats pre-ticked, T1 shows mode chip.

### 2.4 Posture (NEW screen)

Sticky segmented control, 3 panels: **Today · Assess · Photo**. One panel visible at a time; screen never stacks all three.

**Panel Today (default)**
| Card | Shows | Action |
|------|-------|--------|
| P1 Daily cues | Today's 3–5 posture cues as checklist rows (icon, name, dose, checkbox ≥44px) — drawn from findings (chin tucks, wall angels, doorway stretch, pull-aparts…); progress "2 of 4" | One-tap check per row (primary interaction). All done → card collapses to "Posture done ✓" |
| P2 Grade summary | Latest band-assessment grades as 4 chips (e.g. Head B · Shoulders C · Pelvis A− · Thoracic B) + date | Tap → Assess panel |

**Panel Assess**
| Card | Shows | Action |
|------|-------|--------|
| P3 Band posture assessment (NEW) | "2-minute band check": 4 graded tests (wall posture/head, shoulder/pec via band pull-apart form, pelvic tilt via band-resisted march, thoracic extension over band anchor) — each scored A/B/C/D by simple observable criteria chosen in the flow; last grades + date, or "Not done yet" | **Start check** (primary) → wizard flow: one test per screen, big option buttons (existing `.testcard .opts` style), grade computed at end, saved to history |
| P4 Movement assessment (existing 13 tests) | Progress meter (existing), "6 core tests unlock scoring", last scored date + findings count | **Continue / Retest** → existing wizard-style flow (tests one per screen in v4 — currently one long list; convert to stepper with progress bar, answers auto-save, Skip = no data invariant preserved); **Results** → findings sheet (severity chips + title + fix line; long description behind each row's expand) |
| P5 Stop rules | Red-flag copy, collapsed to a 1-line warning bar | Tap → safety sheet (full existing stop-rules text). Always visible as the bar, never as a full card |

**Panel Photo (NEW — photo posture check)**
| Card | Shows | Action |
|------|-------|--------|
| P6 Photo check | Last check: thumbnail (side view), date, overall grade + 3 finding chips (e.g. "Forward head +", "Pelvis: anterior tilt") — or empty state with sample silhouette | **New photo check** (primary) → flow below |
| P7 History | Last 3 checks as small rows (date, grade) | Tap → result sheet |

Photo flow (full-screen, 3 steps): ① **Capture** — `<input type="file" accept="image/*" capture="environment">` (single-file constraint: no camera API dependency), ghost-silhouette overlay guide + 2 lines ("Side-on, full body, plain wall"); image downscaled on-device to ≤1024px JPEG before storing (state size guard, §4.4). ② **Send to Muse** — sheet explaining the bridge (same pattern as health sync): button copies/downloads the photo + a fixed prompt; user sends it in Muse chat; Muse returns a small JSON verdict (grade per area + findings). ③ **Import result** — paste/file import, validated, saved; grades render in P6/P2. The app never claims in-app AI: copy says "Assessed by Muse — import the result". Until a result is imported the check sits as "Waiting for Muse" — honest pending state, no fake spinner result.

### 2.5 Moves (Library / exercise database)

Primary action: **search / tap an exercise** (no single CTA button — the list is the action).

- Sticky top: search field (existing `.search`, 48px) + filter chip row (All · Core · Hips · Band · No band · Helps me ♥) — one scrollable row, chips ≥44px. "Helps me" uses existing per-exercise Helps/Watch verdicts.
- List: compact rows, not cards — thumb (icon/emoji tile 46px, existing `.exrow` pattern), name, dose, band tag, verdict dot (Helps=volt, Watch=coral). 48 exercises from `backend/data/exercises.json` baked into the file at build time (single-file rule: no fetch); the 26 with full in-app data keep it, the other 22 ship with directory fields (dose/level/cues) from the same JSON.
- Row tap → **exercise detail bottom sheet** (§3.4): name, dose, band level selector (existing per-exercise levels), cues (≤3 bullets shown), mistakes (≤2), regression/progression lines, Helps/Watch verdict + evidence line, **Watch video** button, **Add to today** (swap-in, respects safety invariants) secondary button.
- **Video popup:** "Watch video" opens a second-level sheet (or replaces sheet content) with the verified embed where one exists (today: Squat University Big 3) and source link-buttons otherwise (existing `vid` search links — never fake an embed). 16:9 `iframe.vid` as existing. Close returns to detail sheet, scroll position kept.
- Featured Big-3 video (ex-Home card) lives here as a pinned first row under a "Start here" chip filter state — not a Home card.

### 2.6 Progress

Sticky segmented control, 3 panels: **Overview · Health · Weight**. Primary action per panel stated; no panel stacks all its predecessors' cards.

**Panel Overview (default)**
| Card | Shows | Action |
|------|-------|--------|
| G1 KPIs | 2×2 mini-grid: sessions/wk, streak, avg pain (7d), gate status — replaces 4 separate KPI cards | — |
| G2 Pain chart | Existing canvas pain chart (fixed 0–10) + sessions/wk mini-bars under it (one combined card, two canvases ≤120px each) | Tap → chart sheet (larger canvas + 30/90-day toggle) |
| G3 Gate | Gate verdict + criteria as 4 compact pass/hold rows (pain, sessions, steps, Zone 2) — full sentences behind "Why?" | **Promote band** when READY (existing gate action) |
| G4 Weekly review | Win (1 line), adjustment (1 line), sessions vs last week | **Export review** (existing .txt) |
| G5 Coach learned | Top 3 Helps + top 2 Watch rows (name + verdict chip) | Tap → sheet with all verdicts + evidence |

**Panel Health (sync)**
| Card | Shows | Action |
|------|-------|--------|
| H1 Sync | Last sync date + coverage days; stale state if >7d | **Sync with Muse** (primary) → sheet: 3 numbered steps (Ask Muse → get file → Import), **Import sync file** + paste-JSON field (existing logic), Pause/Delete as text-buttons in a "Manage" row |
| H2 Health charts | 2×2 stat tiles (Steps avg, Zone 2 min/wk, Sleep avg, Weight last) each with a sparkline canvas (≤56px); below, one chart card switchable by chips: Steps / Zone 2 / Sleep (bars, 14d, from `S.health.days`) | Chip switch in place — never three stacked charts |
| H3 Recent days | Last 5 days as compact rows (date, steps, Z2, sleep) — replaces the existing full table | "All 28 days" → sheet with the table |

**Panel Weight**
| Card | Shows | Action |
|------|-------|--------|
| W1 Weight | Current weight (big), Δ vs 4 wks ago, weight-vs-pain chart (existing trend canvas, honesty floor copy preserved as 1 line when <4 paired weeks) | **Log weight** (primary) → sheet: number input + date (manual entries join synced weigh-ins, source-tagged); waist weekly entry lives in the same sheet (existing `S.waist`) |
| W2 Calories & plan (NEW) | Plan card: goal (e.g. "Lose ~0.4 kg/wk"), daily calorie target, protein floor (existing tracker merges here: today's protein bar + quick-add chips +10/+25/+40), projected date at current trend — all computed from `S.bodyweightKg` + W1 trend; if no goal set: "Set a goal" state | **Edit plan** → sheet (goal weight, rate, activity level → target recalculated; show formula inputs, 3 lines max) |
| W3 Assessment history | Last 3 rows (date, findings count) | Tap → sheet with full history table |

Protein tracker moves here from its own Progress section (it is a weight/nutrition tool, not a standalone section). Export/backup moves to Profile (§5) — Progress keeps data *display* only.

### 2.7 Profile / Settings (via header avatar; not a tab)

List-screen pattern (AYU §6.2): grouped tappable rows, each row = label + current value + chevron, ≥52px tall. No cards-with-paragraphs. Primary action: none global — each row is its own action.

- **Profile group:** Name (edit sheet) · PIN (Set/Change — old+new, mirrors AYU `PinChange{old,new}`; Remove) · Profiles on this device (future multi-profile: row shows "Ayaan — only profile", disabled with "v4.x" tag — do not build switching now).
- **Mode group:** Work/Travel mode toggle row (On = Live defaults no-band/quiet/hotel-friendly, Home/Train chips show it; auto-suggest banner when calendar… no — manual only, single-file has no calendar access; copy says so) · Daily reminder (time row → existing reminder logic, ex-More) .
- **Plan group:** Band levels summary → Moves-filtered sheet · Retest due (date row → Posture Assess) · Deload status (read-only row, from existing deload state).
- **Data group:** Backup ritual (destination row + **Export weekly backup** button + last-export/due state — ex-Progress, logic unchanged: refuses without a named destination) · Export JSON · Export log CSV · Health sync manage (→ Progress Health) · Erase all data (danger row, confirm sheet).
- **About group:** Safety & scope → sheet (full existing safety paragraph) · References → sheet (existing reference list) · Roadmap → sheet (existing roadmap cards as a simple list) · Version row ("BackForge v4.0 · data on this device only", read-only).

---

## 3. Design tokens

Keep the existing palette and fonts verbatim — v4 is a layout overhaul, not a rebrand.

### 3.1 Colour (existing `:root`, unchanged)
`--bg #0B0D10 · --bg2 #0F1216 · --surface #151920 · --surface2 #1B2029 · --line #262C37 · --ink #F2F4F1 · --muted #9AA5B1 · --faint #828D9B · --volt #C8F04B (accent/primary/positive-action only) · --volt-ink #141A05 · --coral #FF6B4A (flare/attention) · --sky #5CC8FF (info/links) · --violet #B79CFF · --gold #FFC24B (streak/badges) · --good #4ADE80 · --warn #FFC24B · --bad #FF6B6B`.
Usage rules: one volt element per screen region (the primary action); semantic colours only for their meaning (never decorative); grades A=good, B=volt, C=warn, D=bad; charts: pain=coral, steps=sky, Zone 2=volt, sleep=violet, weight=gold — fixed mapping everywhere.

### 3.2 Spacing & shape (additions to `:root`)
- Spacing scale: `--s1:4px --s2:8px --s3:12px --s4:16px --s5:20px --s6:24px`. Screen padding 16px sides (`.wrap` padding 18px→16px on mobile, keep 1120px max). Card gap 12px; card padding 16px (was 18px).
- Radius: keep `--r:18px` (cards), `--r-sm:12px` (rows/inputs/thumbs); add `--r-lg:24px` (sheets, player). Pills stay 99px.
- Tab bar: height 60px + `env(safe-area-inset-bottom)`, existing blur/`--bg2` 94% treatment; body bottom padding = tab bar + 16px. Header 56px (was 60px).
- Shadows: none (current design is border-based — keep; sheets get the existing overlay blur/dim only).

### 3.3 Type scale (Space Grotesk display / Inter body — unchanged families)
| Token | Size/weight | Use |
|---|---|---|
| display | 28px / 700 SG | Screen titles (one per screen, replaces all `sec-t` stacks) |
| card-title | 17px / 600 SG | Card headings (existing `.card h3`) |
| body | 15px / 400 Inter | Default (existing) |
| small | 13px / 400, `--muted` | Secondary lines, sheet body |
| micro | 11.5px / 700, uppercase, ls .06em | Tags, KPI labels, tab labels 11px/600 |
| stat | 27–32px / 700 SG, tabular-nums | KPI numbers, readiness, weight |
Hard rule: **max 2 text sizes per card** (title + one body size; stat cards title+stat). No paragraph over 2 lines on any screen — longer copy only in sheets.

### 3.4 Touch, sheets, modals
- All interactive targets **≥44×44px** (existing `.btn.sm`, `.seg`, `.chips`, `.iconbtn` already comply — audit `.tag`, week-dot, and table-row actions up to 44px hit area via padding). Tab buttons ≥48px wide. Slider thumbs: pain range keeps native + 28px track height (existing).
- **Bottom sheet pattern** (existing `.overlay`/`.sheet`, formalised): slides from bottom, radius `--r-lg` top corners, drag-handle bar (36×4px, `--line`), title 20px SG + one-line sub max, close ✕ top-right ≥44px, `max-height:92dvh`, internal scroll only. ≥720px: centred dialog, radius `--r-lg` all corners (existing media query). Focus trap + Esc close + return focus to opener; `role="dialog" aria-modal="true"` (existing).
- **Full-screen overlays** (player, wizards, PIN): `position:fixed; inset:0; z-index:90+`, own header row (title + close), no tab bar visible.
- Toast: existing, bottom offset must clear tab bar (110px mobile — keep).
- Motion: 200–250ms ease transitions (existing fade), `prefers-reduced-motion` block already present — extend it to sheet slide and PIN shake.

### 3.5 Accessibility (WCAG-minded)
`aria-selected`/`aria-current` on tabs (existing pattern in `go()`), segmented controls as `role="tablist"` with arrow-key support, sheets labelled by their title, canvas charts get `role="img"` + `aria-label` summarising the trend in words (e.g. "Pain trending down, 4.1 to 3.2 over 14 days") plus a visually-hidden data table for the chart sheet, grade chips never colour-only (letter always shown), focus-visible volt outline (existing), contrast: `--faint` on `--bg` is captions-only, never body text.

---

## 4. Navigation & state rules

### 4.1 The micro-counts rule is load-bearing
- Check-in stays on **Home C2, one card, one Save tap** — never moved into a flow, never behind a tab switch. Posture cues check off in **one tap per row** (Posture P1 and Home C4 share state — checking either checks both).
- Logging anything (session, weight, protein, cue) is ≤2 taps from its tab screen. If a v4 change adds a tap to any of these, the change is wrong.
- Done states collapse in place (cards shrink to one line) so a finished day makes Home *shorter*, rewarding completion visually.

### 4.2 Screens vs flows vs sheets vs player
- **Tab switch** only via tab bar/header tabs/avatar. Tab switches preserve scroll position per tab (store `scrollY` per view in memory, restore on return — v3 resets to top via `go()`; change to restore, except first visit of the day → top). Last tab persisted (`S.ui.lastTab`) for PIN-gate return and PWA relaunch.
- **Player is always a full-screen overlay**, launched from Home C3 / Train T1/T3, never a view. Existing invariants carry over untouched: resume from `S.livePlayer`/`S.player`, wake lock, hold timers, Regress/Skip, finish pain score. While the player is open the tab bar is hidden and hardware back = "pause & exit?" confirm, never a tab jump. A minimized-player pill (existing resume concept) shows on Home/Train if a session is in progress.
- **Wizards** (band assessment, movement assessment, photo check) are overlays with step state kept in memory + answers auto-saved to `S` per step (existing assessment behaviour); abandoning mid-flow keeps progress and the entry card shows "Continue".
- **Sheets never stack more than 2 deep** (list → detail → video is the max, video replaces detail content rather than adding a third layer). Closing a sheet never changes the active tab.
- Deep-linking: keep the existing hash-less model; `data-nav` attributes remain the single nav mechanism — rename values to the new view ids in one pass.

### 4.3 The "Why?" pattern (how text survives without walls)
Every computed thing (readiness, gate, Live build, deload, trend correlation, plan targets) shows on-screen: **verdict + one line**. Full reasoning (existing arithmetic/receipts/evidence/honesty caveats) moves verbatim into a "Why?" sheet opened from that card. No explanatory copy is deleted from the product — it is demoted from screens to sheets. Correlation-is-not-causation and Zone-2-floor caveats stay *on* the W1/H1 cards as single lines (safety/honesty copy is exempt from demotion).

### 4.4 State additions (additive, lossless — schema 2 → 3, same migration discipline as v3.0)
All inside `backforge_v1`, defaults merged in `bfDefaults()`/`migrateState()` exactly like `health`/`waist`/`backup` were:
```js
profile:{name:'', pinHash:null, pinSalt:null},
posture:{cues:{}, /* dateStr -> {cueId:true} */ bandChecks:[], /* {date, grades:{head,shoulders,pelvis,thoracic}} */
         photoChecks:[] /* {date, thumb:dataURL(≤1024px), status:'waiting'|'done', grades, findings[]} */},
weightLog:[], /* {date, kg, source:'manual'|'scale'} — manual only; synced weigh-ins stay in health.days */
calPlan:{goalKg:null, rateKgWk:0.4, kcalTarget:null, activity:'light', updatedAt:null},
mode:{travel:false},
ui:{lastTab:'home'}
```
PIN hash/salt excluded from JSON export (strip on export, like a credential). Photo thumbnails: cap array at 12 checks, downscale before save — if `localStorage` quota errors, drop oldest thumbnail, keep grades (existing `save()` try/catch already swallows; add the trim there).

---

## 5. Cut / collapse list — where everything in the current UI goes

| Current section (v3.0) | Fate in v4 |
|---|---|
| Today hero (kicker, H1, lede, CTA row) | **Cut.** Replaced by 28px screen title "Today" + date line. First-run only: one slim "Take the posture check" banner until first assessment exists |
| Today 4-KPI row | **Cut from Home** → Progress G1 (2×2) |
| Today "Your week" grid (7 cards) | **Cut** → Train T4 week strip (one row) |
| Today "Watch: the Big 3" video card + paragraph | **Moved** → Moves pinned row; video only inside video popup |
| Today check-in `sec-sub` paragraph | **Cut** (one-line label remains) |
| Today Coach's read card (full arithmetic) | **Collapsed** → readiness number + 1 line in Home C3; arithmetic → Why? sheet; repair/deload offers → Home C5 conditional slot |
| Live quote card | **Cut as a card** → finish-screen quote (existing celebrate) + optional 1 line in T1 |
| Live habit card (dots + badges) | **Split** → dots to Home C1; badges to Progress Overview (one row in G4 sheet if needed — badges are not a screen card) |
| Live coach-notes card | **Moved** → T2 Why? sheet |
| Live "Your default workout" full plan card | **Collapsed** → T2 (3 rows + why line) |
| Live desk-day card (long detection explanation) | **Collapsed** → T3 one-liner; explanation → its sheet (flare swap rule unchanged) |
| Assess intro paragraph + sticky score bar + 13 stacked test cards | **Converted** → Posture Assess panel (P4) + one-test-per-screen wizard; stop-rules alert box → P5 one-line bar + sheet; findings list → results sheet |
| Library cards grid (full cue text per card) | **Collapsed** → compact rows; all detail → exercise sheet |
| Progress intro paragraph + 9 stacked sections | **Cut paragraph; sections → 3 segmented panels** (§2.6); response-learning full list → G5 sheet; sync recent-days table → H3 (5 rows + sheet); assessment history table → W3 sheet |
| Progress "Your data is yours" + backup ritual | **Moved** → Profile Data group (logic/copy unchanged) |
| More tab (entire view) | **Abolished.** Reminder → Profile; roadmap cards → Profile About sheet (list form); references → Profile About sheet; safety paragraph → Profile About sheet + Posture P5 |
| Footer text | **Cut** → version row in Profile |
| `sec-t` + `sec-sub` heading pairs everywhere | **Cut pattern.** One screen title per view; cards are self-titled. This pattern alone removes ~30 headings/paragraphs |

Nothing functional is deleted: every engine, card computation and data flow in v3.0 has a named home above. What dies is *stacking*.

---

## 6. AYU Studio lessons — borrowed patterns

AYU Studio (owner's Pi app; API audited from `~/workspace/ayu-studio-maintenance/openapi.json`):

1. **PIN-per-profile gate** — AYU: `POST /api/me/pin` with `PinIn{user_id, pin}` to enter, `PinChange{old, new}` to change. → BackForge §2.1: same two interactions, fully local — entry gate keyed to the device profile, change flow in Profile requiring the old PIN first. AYU proves the owner already knows/likes this flow; zero learning curve.
2. **Per-user navigation state** — AYU: `PUT /api/me/nav` with `NavIn{order[]}` — "each person has their own" arrangement. → BackForge: persist `ui.lastTab` (and, cheap to add later, tab order) per profile in `S.ui` instead of hard-coding one shell for everyone; when multi-profile lands (roadmap v4.0 clinic edition), each profile brings its own shell state.
3. **Card-list home, not document home** — AYU's work surface is `GET /api/projects`: a list of project cards, each a compact summary that opens one focused workspace. → BackForge Home/Moves/Progress lists follow exactly this: rows/cards are *summaries with one action*, detail always one tap deeper (sheet), never printed in full on the list.
4. **One screen = one job** — AYU splits brief / dates / transcript / comments / revision into separate per-project endpoints and screens (`/api/projects/{pid}/brief`, `/dates`, `/transcript`…) rather than one mega-page. → BackForge's segmented panels (Posture: Today/Assess/Photo; Progress: Overview/Health/Weight) are the single-file equivalent: topics get panels/flows, not stacked sections.
5. **Bottom-tab mobile shell with a small fixed tab set** — AYU runs a bottom-tab shell on mobile with per-user nav. → BackForge §1.1: 5 fixed tabs, identity in the header, everything else demoted to Profile/sheets — the same shell discipline, which also keeps the two apps feeling like siblings for the owner.

*Not* borrowed: AYU's server accounts/sessions (BackForge stays local-first, no server, per README invariant) and its multi-user roles (single profile in v4.0 scope; structure `S.profile` so a second profile is additive later).

---

## 7. Build checklist (for the coordinator)

1. Rename views/nav: `today→home, live→train, assess→posture(+panels), library→moves, progress→progress(+panels), more→` deleted; add `view-profile`; avatar button in header; SVG tab icons.
2. Add `:root` tokens §3.2; audit all targets ≥44px; extend reduced-motion to sheets/PIN.
3. Implement segmented-panel switcher (generic: `data-seg` buttons + panels, `role=tablist`) — used by Posture and Progress.
4. Move content per §5 table; convert assessment list → stepper wizard (reuse scoring untouched); build band-assessment wizard + grading, photo-check flow, weight log + calories plan card, travel-mode toggle effects in Live builder defaults.
5. Schema 3 migration + new state keys §4.4; PIN gate overlay + hash helpers; export strips PIN fields.
6. Harness: extend `dev/harness-v3.mjs` pattern — viewport-budget check per view (rendered height at 390px width ≤ 1.5×844 in default state), tab count = 5, micro-counts regression (check-in save = 1 tap from Home; cue check = 1 tap), migration losslessness incl. new keys, PIN gate lock/unlock.
