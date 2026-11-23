# BackForge — Design Protocol (v5 shell + Live Mode)

Status: **authority document** for the rebuild of the app shell, UI and Live Mode. Where this file and `dev/v4-specs/c-ux-architecture.md` disagree, this file wins for anything visual, navigational, or Live-related. Engines (assessment scoring, `buildFoundation`, `buildLiveWorkout`, readiness, gate, health sync, vault, PIN) are **ported, not rewritten**: they move into modules with their tests and their outputs feed the new UI unchanged. The safety invariants in `CLAUDE-REVIEW.md` §5 are inherited verbatim and re-enforced at the Live compile stage (defence in depth).

Stack (fixed): no build step · native ES modules · Preact + htm vendored in `/vendor` · modern CSS (oklch, `@layer`, nesting, container queries, View Transitions, scroll-driven animations, `@property`, `@starting-style`, Popover API) · Web Speech (voice coach) · Web Audio (cues) · Media Session · Wake Lock. State stays in `localStorage` key `backforge_v1` (schema bump is additive, same migration discipline as v3/v4).

---

## 1. Diagnosis — what makes the current app clanky

1. **"Live" is not live.** `showLiveStep()` is a manual stepper: every step needs **"Done — next →"**; holds need **"Start hold · Ns"**; the user must choose a timer from **"20s / 30s / Rest 45s / Rest 60s"** buttons mid-exercise. Rep work shows a dead `0:00` clock. You cannot complete a session hands-free — the core promise fails.
2. **The duration you pick is not the duration you get.** Chips 5/10/20/35/50 feed `buildLiveWorkout()`, whose `est` is a sum of `estMins(dose)` guesses. No real-time timeline exists; rest is hard-coded (`liveNext` → 45 s only *between different exercises*; `nextStep` → 60 s), and **there is no rest between sets at all**.
3. **Two players, two truths.** `startPlayer/showStep` (state `S.player`) and `startLive/showLiveStep` (state `S.livePlayer`) duplicate logic with different rest rules, different copy, different resume paths. Home and Train each launch a different one.
4. **The player is a bottom sheet re-rendered by `innerHTML` every step.** `openSheet()` rebuilds the whole DOM (screen readers lose place, focus jumps to the first button), the close label is "Save & exit", and the stop-rule paragraph is reprinted under every single step — safety copy as wallpaper, which trains the eye to ignore it.
5. **Audio is fragile and mute.** `beep()` constructs a **new `AudioContext` per beep** (leaks; browsers cap contexts; iOS needs a gesture unlock each time). One sound exists. End of hold = `toast('Time — nice work')`. No voice, no Media Session, wake lock acquired in four places and never re-acquired on `visibilitychange`.
6. **Dose data cannot drive a clock.** `parseDose()` caps sets with `Math.min(3, …)`, discards holds `< 8 s`, and never models reps × tempo, so the player literally cannot know how long a set lasts.
7. **Decision load before "Start".** The button reads **"▶ Build it & start — no more decisions"** directly under three decision groups (5 time buttons, 4 feel buttons, 6 caveat chips). Home blocks its primary action behind a 3-input check-in.
8. **Navigation identity drift.** Labels say Home/Train/Posture/Moves/Profile; ids are still `today/live/assess/library/more`; the avatar calls `go('more')`; the streak shows in the header **and** Home's status row; the cut footer still renders; Home *and* Train both own a Start. Spec C's own rules (pinned Big-3 row, wizard assessment, list-row Profile) were not applied: Moves opens with a paragraph video card, Posture→Assess still stacks 13 test cards (`#testList`), Profile is six text cards incl. full Roadmap/References.
9. **Layout is a stretched phone column.** Only `640/720/820px` media queries; desktop is a 1120 px single column; no tablet rail, no landscape player, no container queries. 191 inline `style=""` attributes and 90 inline `onclick`s make every fix a regression risk.
10. **Visual language reads "web page".** Emoji as exercise imagery (`ic:'🧎'`, `'🐦'`), flat hex surfaces, no depth hierarchy, one fade animation, colour-only progress dots, no live regions, reduced-motion covering only the panel fade.

---

## 2. Frontier references — borrow / do not borrow

| Source | Borrow (pattern) | Do NOT borrow |
|---|---|---|
| **iOS 26 Liquid Glass** | Glass is the *navigation/control layer* floating above content; tab bar that **shrinks on scroll-down** and re-expands on scroll-up; concentric corner radii (inner = outer − padding); specular rim on top edge; controls morph (Start button → player ring). | Glass on content cards with body text; heavy lensing behind small text; tinted glass that drops contrast below AA. |
| **Apple Fitness+** | One ring = time remaining, metrics in the corners; on-screen trainer callouts synced to speech (our captions); "Up next" tile; session *timeline* shown before start; filter by duration. | Celebrity-trainer dependence; burn-bar comparison. |
| **Whoop** | One morning number with a colour state and a **contributors breakdown** (sleep, load, pain); baseline bands (your normal range) on HRV/RHR. | Red = "bad day" punishment; strain-maximising framing. |
| **Oura** | Plain-language readiness contributors with "Pay attention" tags; **sleep hypnogram** + stacked stage bars; trend "vs your baseline", not vs population. | 20-tile overload; vague "tags" taxonomy. |
| **Bevel** | Dense **bento grid** of health tiles with sparklines, strict numeric typography, tabular figures; tap tile → full chart sheet. | Microscopic labels; decorative charts without units. |
| **Gentler Streak** | Self-compassion: **rest is a valid, celebrated state**; "within your range" instead of fixed targets; streaks that bend (repair) instead of break. | Mascot whimsy that undermines clinical trust. |
| **Ladder** | Audio-first coached session that **runs on a clock** and keeps going in your pocket; set/rest structure called out by voice; next-move preview during rest. | Team chat, social pressure. |
| **Future** | Coach voice that **references your data** ("you slept 5 hours — we'll keep it steady"). | Human-coach dependency; subscription walls. |
| **Peloton** | **Class-plan bar**: the whole session as coloured segments with a playhead; cue cadence (cue early, encourage late); music/voice ducking. | Leaderboards, hype volume, "push through it". |
| **Strava** | **Consistency heatmap** and weekly totals; trend of effort. | Kudos, segments, public feeds. |
| **Hinge / Sword Health** | **Pain before and after** every session (delta shown); per-exercise "that hurt" escape hatch; short sessions; escalation copy that is calm and specific; regressions without judgement. | Sensor hardware assumptions; clinician-chat UI (we have none). |
| **Nike Training Club** | Huge exercise name, loop visual, "Up next", rest screen with the next move's setup; workout preview with total time. | Endless library browsing as the home screen. |

---

## 3. Principles (7)

1. **One tap to the right session.** Today shows one Start; defaults are already decided. Anything else is optional and collapsed.
2. **The clock is the coach.** A session is a compiled timeline that runs by itself; touching the screen is for exceptions, never for progress.
3. **Safety speaks first, never shouts.** The safety line is said once at the start, re-offered at the right moment (pain button, rest checks), and is never reprinted as wallpaper.
4. **Glass for controls, solid for reading.** Translucency lives on navigation, controls and the player chrome; text-heavy content sits on opaque-enough surfaces that pass AA on the worst backdrop.
5. **Verdict + one line; the why is one tap away.** (Spec C's "Why?" pattern, kept.)
6. **Readable at two metres.** Live player numerals, names and captions are legible from a mat on the floor with the phone propped on a chair.
7. **Micro counts; nothing shames.** Skips are no-data, regressions are praise-worthy, rest days are green.

---

## 4. Information architecture

### 4.1 Destinations (exactly five)

| # | Destination | Route | Job | Absorbs |
|---|---|---|---|---|
| 1 | **Today** | `#/today` | Readiness, the one session + Start, posture cues, health strip, one conditional nudge | Home, check-in, posture cues, desk-day block, streak/week |
| 2 | **Live** | `#/live` → `#/live/play` | Duration setup (≤3 decisions) → full-screen player → finish | Train builder, both old players |
| 3 | **Moves** | `#/moves`, `#/moves/:id` | Library, search/filters, exercise detail sheet, video | Moves, Big-3 pinned row |
| 4 | **Progress** | `#/progress/:seg` | Segments **Overview · Health · Body · Posture** | Progress panels, assessment history, posture grades/photo history (read-only) |
| 5 | **You** | `#/you` | Profile, **Check-ups**, preferences (voice, sound, motion, glass), data, privacy, about | Profile/More |

Live is a destination (not a centre FAB): it is where duration choice lives and where a running session returns. A running session additionally shows a **mini-player pill** (glass, 56 px, above the tab bar / at the bottom of the sidebar): exercise name, ring thumbnail, pause. Tap → player.

### 4.2 Classic tools during transition

- **Check-ups hub** at `#/you/checkups` (row group, also deep-linked from Today and Progress): *Movement assessment (13 tests)*, *Band posture check (8 tests)*, *Photo check*, *Photo vault*. Each is a full-screen **flow** (one step per screen) using the existing scoring/grading functions untouched.
- **Surfacing:** Today shows a "Check-up due" nudge (retest date reached, or never assessed — first-run banner); Progress → Posture shows grades + photo history read-only with "Retake" linking into the hub. Red-flag stop rules lead every check-up flow as screen 1 (invariant 7).
- **Transition islands:** until a flow is rebuilt, its legacy renderer is mounted inside a `<ClassicIsland>` component (solid surface, no glass, a small "Classic" tag in the header, own scroll). Rewrite order: Movement assessment wizard → Band check → Photo check → Vault. An island never appears inside Today or the player.
- **PIN:** unchanged hash logic; pre-shell gate overlay (glass-thick keypad over the ambient background); manage under `You → Privacy & PIN`.

### 4.3 Shell per form factor (shell uses viewport media queries; components use container queries)

| Class | Viewport width | Navigation | Content |
|---|---|---|---|
| **Compact** | < 600 px | Bottom glass tab bar, 5 items, 64 px + safe-area; shrinks to 48 px icon-only on scroll-down (scroll-driven), expands on scroll-up | 1 column, 16 px gutters |
| **Medium** | 600–1023 px | Left **glass rail** 80 px: icons + labels, Start Live button at top, mini-player at bottom | 1–2 columns (container queries decide), max content 840 px |
| **Expanded** | ≥ 1024 px | **Sidebar** 248 px: wordmark, 5 destinations, "Start today's session" button, mini-player, You at bottom | 2 columns; Moves/Progress list-detail (list 360 px + detail pane) |
| **Large** | ≥ 1440 px | Sidebar | 3 columns on Today (hero · health · plan); Progress charts in a 2×N grid |

Sheets: bottom sheet (compact) · centred dialog (medium) · **right detail pane** in list-detail screens (expanded). Max 2 sheet levels. Player is always full-screen and hides all navigation.

---

## 5. Visual system

All tokens live in `app/css/tokens.css` in `@layer tokens`. Names are fixed; values may be tuned only by changing this file.

### 5.1 Layer order
```css
@layer reset, tokens, base, materials, layout, components, screens, utilities, overrides;
```

### 5.2 Colour — dark-first (default) and light

Brand continuity: volt, coral, sky, violet, gold survive, converted to oklch and tuned for glass.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--c-bg` | `oklch(0.15 0.02 262)` | `oklch(0.97 0.006 250)` | page base under ambient |
| `--c-bg-deep` | `oklch(0.11 0.02 262)` | `oklch(0.93 0.01 250)` | player base |
| `--c-surface` | `oklch(0.21 0.018 262)` | `oklch(1 0 0)` | solid fallback / reading surfaces |
| `--c-surface-2` | `oklch(0.26 0.018 262)` | `oklch(0.955 0.006 250)` | inputs, rows |
| `--c-line` | `oklch(1 0 0 / 0.10)` | `oklch(0.2 0.02 262 / 0.10)` | hairlines |
| `--c-ink` | `oklch(0.97 0.005 250)` | `oklch(0.20 0.02 262)` | primary text |
| `--c-ink-2` | `oklch(0.80 0.015 250)` | `oklch(0.40 0.02 262)` | secondary text (≥ 4.5:1 on all surfaces) |
| `--c-ink-3` | `oklch(0.68 0.015 250)` | `oklch(0.52 0.02 262)` | captions ≥ 15 px only (≥ 3:1) |
| `--c-accent` (volt) | `oklch(0.90 0.19 124)` | `oklch(0.62 0.17 132)` | the one primary action per region, progress |
| `--c-on-accent` | `oklch(0.20 0.05 124)` | `oklch(0.99 0 0)` | text on accent |
| `--c-attention` (coral) | `oklch(0.72 0.18 35)` | `oklch(0.58 0.19 33)` | pain button, safety, flare |
| `--c-info` (sky) | `oklch(0.80 0.12 230)` | `oklch(0.55 0.14 240)` | links, info |
| `--c-calm` (lavender) | `oklch(0.78 0.11 295)` | `oklch(0.52 0.15 295)` | relief day, cool-down, rest |
| `--c-reward` (gold) | `oklch(0.86 0.15 82)` | `oklch(0.62 0.14 70)` | streaks, milestones |
| `--c-good` / `--c-warn` / `--c-bad` | `oklch(0.80 0.17 152)` / `oklch(0.84 0.15 80)` / `oklch(0.68 0.20 25)` | `oklch(0.55 0.15 152)` / `oklch(0.60 0.14 70)` / `oklch(0.55 0.20 25)` | grades A/C/D, status |

Phase tints (Live): `--c-phase-warm: oklch(0.82 0.13 70)` · `--c-phase-main: var(--c-accent)` · `--c-phase-rest: oklch(0.80 0.10 230)` · `--c-phase-cool: var(--c-calm)`.
Readiness states: **Ready** `--c-good` · **Steady** `--c-info` · **Easy** `--c-warn` · **Relief** `--c-calm` (a flare day is lavender, never red — red reads as failure and raises threat perception in a pain population).

Theming: `:root` = dark; `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {…} }` and `:root[data-theme="light"] {…}`. User override lives in `You → Appearance` (System / Dark / Light). The player is **always dark** (bright-screen glare on the floor, battery, focus).

### 5.3 Ambient background
Fixed `<div class="ambient">` behind everything: three large radial blobs (`--c-accent`, `--c-info`, `--c-calm` at 18–24 % alpha in dark, 10–14 % in light) blurred 80 px, drifting on 60–90 s loops via `@property --amb-a/--amb-b <angle>`. Tint shifts with context: Today = readiness colour leads; Live = current phase tint (300 ms crossfade); Finish = gold bloom. Dark mode caps the ambient's max lightness at L 0.35 so glass text contrast holds. Paused (static frame) under reduced motion, when `document.hidden`, and when Battery API reports < 20 % or `saveData`.

### 5.4 Glass materials (3 levels)

```css
--g-thin-bg:    oklch(0.22 0.02 262 / 0.38);  --g-thin-blur:    blur(14px) saturate(150%);
--g-regular-bg: oklch(0.22 0.02 262 / 0.56);  --g-regular-blur: blur(24px) saturate(170%);
--g-thick-bg:   oklch(0.18 0.02 262 / 0.74);  --g-thick-blur:   blur(40px) saturate(180%);
/* light */ --g-*-bg: oklch(0.99 0.004 250 / 0.45 | 0.62 | 0.80);
--g-border:   inset 0 0 0 1px oklch(1 0 0 / 0.10);
--g-rim:      inset 0 1px 0 0 oklch(1 0 0 / 0.22), inset 0 -1px 0 0 oklch(0 0 0 / 0.18);
--g-specular: linear-gradient(160deg, oklch(1 0 0 / 0.16) 0%, oklch(1 0 0 / 0.04) 28%, transparent 55%);
--g-noise:    url("data:image/svg+xml,…feTurbulence baseFrequency='0.9' numOctaves='2'…") /* 3 % opacity, kills banding */;
```
`.glass-thin|regular|thick` = background + `backdrop-filter` + `box-shadow: var(--g-border), var(--g-rim), var(--elev-n)` + `::before` specular gradient (`mix-blend-mode: plus-lighter`, `pointer-events:none`) + `::after` noise.

| Level | Used for |
|---|---|
| **Thin** | Chips, segmented controls, mini-player, player secondary buttons, health tiles' header strip |
| **Regular** | Tab bar, rail, sidebar, cards that hold *controls* (Live setup, Today hero), player control bar, next-up chip |
| **Thick** | Sheets, dialogs, popovers, PIN keypad, pause sheet, pain sheet |

Rules: max **3 stacked glass layers** at any pixel; **no glass on list rows or scrolling text** (rows are `--c-surface-2` inside a glass card); body text on glass needs Regular or Thick. Fallbacks: `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)` and `You → Appearance → Solid surfaces` all map `--g-*-bg` to `--c-surface` (alpha 1), drop blur, keep rim + border.

### 5.5 Radius, spacing, elevation
- Radius: `--r-xs 8 · --r-sm 12 · --r-md 18 · --r-lg 26 · --r-xl 34 · --r-pill 999`. Concentric rule: child radius = parent radius − parent padding (min `--r-xs`).
- Spacing (4-pt): `--sp-1 4 · --sp-2 8 · --sp-3 12 · --sp-4 16 · --sp-5 20 · --sp-6 24 · --sp-8 32 · --sp-10 40 · --sp-12 48`. Gutter 16 compact / 24 medium / 32 expanded.
- Elevation (shadows under glass, tinted to bg hue): `--elev-1: 0 1px 2px oklch(0 0 0/.25)` · `--elev-2: 0 6px 20px -6px oklch(0 0 0/.40)` · `--elev-3: 0 18px 48px -12px oklch(0 0 0/.55)`. Tab bar/rail = 2, sheets = 3, cards = 1.

### 5.6 Typography
- **Inter** (variable: `wght` 400–800, `opsz` 14–32) for all UI and **all numerals** — `font-variant-numeric: tabular-nums` and `font-feature-settings: "cv11","ss03"` (single-storey a off, open digits). Optical size makes the same family work at 13 px captions and 160 px countdowns; tabular figures stop the timer from jittering.
- **Space Grotesk** 600 for screen titles and the wordmark only (brand continuity with v1–v4; owner recognises it).
- Vendored as Latin-subset woff2 in `/vendor/fonts` (offline PWA), sourced from Google Fonts; `font-display: swap`; fallback `system-ui`.

| Token | Size / line / weight | Use |
|---|---|---|
| `--t-countdown` | `clamp(96px, 28vmin, 220px)` / 1 / 700, opsz 32, tnum | player ring numerals |
| `--t-display` | 34 / 40 / 600 SG | screen title |
| `--t-title-1` | 28 / 34 / 700 | player exercise name (compact); 40 on expanded |
| `--t-title-2` | 22 / 28 / 650 | card hero, sheet title |
| `--t-headline` | 17 / 24 / 600 | card titles, row primary |
| `--t-body` | 16 / 24 / 400 | default |
| `--t-callout` | 15 / 22 / 450 | secondary lines |
| `--t-caption` | 13 / 18 / 500 | metadata, axis labels |
| `--t-micro` | 11 / 14 / 650, +0.06em, uppercase | tags, section labels |
| `--t-stat` | 32 / 36 / 700 tnum | tile numbers |

Max 2 sizes per card (+ stat). No paragraph longer than 2 lines outside sheets.

### 5.7 Iconography
One inline-SVG sprite (`app/js/ui/icons.js`, inline SVG paths), 24 px grid, 1.75 px stroke, round caps/joins, `currentColor`; filled variant for the selected tab. No emoji anywhere in UI. Exercise imagery = per-exercise **pose glyph** (simple stroke figure, same grid) in `app/js/ui/icons.js` (pose glyphs: future); until drawn, a category glyph (core / hip / band / breath / mobility / desk). Icon set needed: today, live (play-in-ring), moves, progress, you, play, pause, skip, back, easier (down-chevron-step), plus15, voice, voice-off, pain (hand-stop), check, flame, band, clock, side-L, side-R, heart, moon, steps, scale, info, close, search, filter, lock.

### 5.8 Data-viz palette (fixed mapping everywhere; dark / light)

| Metric | Token | Dark | Light | Form |
|---|---|---|---|---|
| Steps | `--viz-steps` | `oklch(0.80 0.12 232)` | `oklch(0.56 0.14 240)` | daily bars + 7-day avg line |
| Zone 2 min | `--viz-z2` | `oklch(0.82 0.16 152)` | `oklch(0.56 0.15 152)` | weekly bars vs 150-min reference line |
| Resting HR | `--viz-rhr` | `oklch(0.72 0.16 15)` | `oklch(0.55 0.18 15)` | line + personal baseline band (30-day mean ± 1 SD) |
| HRV | `--viz-hrv` | `oklch(0.80 0.11 195)` | `oklch(0.55 0.11 200)` | line + baseline band |
| Weight | `--viz-weight` | `oklch(0.86 0.14 82)` | `oklch(0.60 0.13 70)` | dots (weigh-ins) + EWMA trend line + dashed plan projection |
| Pain | `--viz-pain` | `oklch(0.72 0.17 35)` | `oklch(0.56 0.18 33)` | line on fixed 0–10 axis; numbers always labelled |
| Sleep: awake / REM / light / deep | `--viz-sl-awake/rem/light/deep` | `0.84 0.11 70` / `0.74 0.15 325` / `0.70 0.10 268` / `0.50 0.15 275` | `0.66 0.12 70` / `0.56 0.17 325` / `0.66 0.09 268` / `0.40 0.15 275` | hypnogram + stacked nightly bars (stages ordered by lightness so they survive greyscale) |
| HR zones Z1–Z5 | `--viz-hr1..5` | `0.72 0.05 250` / `0.82 0.16 152` / `0.86 0.15 95` / `0.76 0.16 55` / `0.66 0.20 25` | darker by −0.2 L | stacked minutes; Z2 is the only highlighted zone |
| Sessions | `--viz-sess` | `var(--c-accent)` | same | heatmap cells: 0 = `--c-surface-2`, micro = 35 % accent, full = 100 % |
| Readiness | state colours §5.2 | | | ring + 30-day sparkline |

Charts: hairline grid `--c-line`, axis labels `--t-caption --c-ink-3`, no chart junk, every chart has `role="img"` + a sentence `aria-label` and a hidden data table in its sheet. Health metrics never share a colour with an action.

---

## 6. Motion

### 6.1 Tokens
```css
--d-instant: 90ms;  --d-fast: 160ms;  --d-base: 240ms;  --d-slow: 380ms;  --d-scene: 520ms;  --d-celebrate: 900ms;
--e-out:      cubic-bezier(.2,.8,.2,1);        /* entrances */
--e-in:       cubic-bezier(.4,0,1,1);          /* exits */
--e-in-out:   cubic-bezier(.65,0,.35,1);       /* moves, morphs */
--e-spring:   linear(0, .22 8%, .62 18%, .9 28%, 1.03 38%, 1.05 46%, 1.02 58%, .995 72%, 1);  /* gentle, 1 overshoot */
```

### 6.2 What animates and why
| Element | Motion | Why |
|---|---|---|
| Button press | scale .97 + specular brighten, `--d-instant` | tactile confirmation |
| Tab bar | shrink/expand via `animation-timeline: scroll()`; selected pill slides between items (`--e-spring`) | content space + orientation |
| Sheets / popovers | `@starting-style` translateY(24px)+opacity → 0, `--d-slow --e-out`; exit `--d-base --e-in` | spatial origin |
| Screen change | same-document View Transition, crossfade + 8 px lateral slide in tab order direction, `--d-scene` | where-am-I |
| Today Start → Player | Start button morphs into the player ring (`view-transition-name: vt-start` on both) | continuity: "this button became the session" |
| Moves row → detail | pose glyph + name morph (`vt-ex-glyph`, `vt-ex-name` set on the tapped row only) | object permanence |
| Readiness ring | sweeps from 0 on first view of the day only, `--d-celebrate` | ritual, once |
| Charts | line draws via `stroke-dashoffset` on first reveal (scroll-driven `view()` timeline), never on re-render | reveal, not distraction |
| Finish | ring closes into a check, gold bloom in ambient, 3 particles max | earned celebration, not confetti |

View Transition names (unique per document): `vt-tabbar`, `vt-title`, `vt-start`, `vt-session-hero`, `vt-ring`, `vt-ex-glyph`, `vt-ex-name`, `vt-mini-player`, `vt-player`. Fallback: if `!document.startViewTransition`, route change is instant.

### 6.3 Live player motion
- **Ring**: SVG circle, `stroke-dashoffset` bound to registered `@property --p { syntax:'<number>'; inherits:true; initial-value:0 }`; JS writes `--p` from the **engine clock** in `requestAnimationFrame` (never a CSS duration — pause, back, +15 s must be exact). Ring colour = phase tint, 300 ms crossfade on segment change.
- **Numerals**: last 3 s of any segment pop (scale 1.12 → 1, `--d-fast --e-spring`) synced to the tick tone; other seconds swap without motion.
- **Segment change**: name/side text cross-fades up 12 px (`--d-base`); next-up chip slides into the name position (it *becomes* the current exercise).
- **Timeline scrubber**: segments are flex items sized by duration, coloured by phase; playhead moves continuously (transform only); the active segment grows 2 px in height; completed segments desaturate to 40 %.
- **Rest**: ring reverses direction (fills instead of drains) and the ambient cools to `--c-phase-rest` — rest *feels* different without reading.

### 6.4 Reduced motion (`prefers-reduced-motion: reduce` or `You → Appearance → Reduce motion`)
Ambient static; View Transitions become 120 ms crossfades; no morphs, no pops, no slides; ring updates once per second in steps; tab bar does not shrink; chart lines appear drawn; celebration = static check + text. Nothing conveys information by motion alone.

---

## 7. Screen specs

### 7.1 Today
**Phone (top → bottom; default state fits 1 viewport + ≤ 0.5 scroll):**
1. Title row: "Today" (`--t-display`) + date (caption) · avatar (→ You) right.
2. **Readiness ring** (128 px, state colour) left; right: verdict word ("Steady"), one line ("Short sleep — we'll keep load moderate"), contributor chips (Sleep · Pain · Load) → Why sheet. If not checked in: the ring is grey with **"How's the back? 0–10"** — a 11-step horizontal pain scale (one tap = check-in saved with defaults sleep from sync/“okay”, location "none"; "Add detail" opens the full check-in sheet). One tap, not three.
3. **Session hero** (glass-regular, `vt-session-hero`): kicker "Today · Strength B", title, "25 min · 9 moves · bands", 3 pose glyphs + "+6", load verdict line; **one full-width Start button** (`vt-start`, accent, 56 px): "Start · 25 min". Secondary text-button: "Change time" → Live setup. Flare day: hero becomes "Relief session · 12 min" in lavender.
4. **Posture cues** row group: 3 checkable rows (one tap each, shared state with Progress→Posture).
5. **Health strip** (horizontal bento, scroll-snap, 6 tiles 140×96, glass-thin header): Steps (yesterday, vs 7-day avg) · Sleep (duration + 4-segment stage bar) · Resting HR (+ Δ vs baseline) · HRV (+ Δ vs baseline) · Zone 2 (week minutes / 150) · Weight (latest + 4-week Δ). Stale data (> 2 days): tile dims, "synced 3 d ago". Tap → Progress → Health with that metric open. Empty: one tile "Connect health data → Sync with Muse".
6. **One conditional nudge** (max one; priority: flare › streak repair › deload › check-up due › sync stale › backup due).
7. Week dots (Mon–Sun) as a thin row at the bottom with streak count.

**Medium:** two columns — left (ring, hero, cues), right (health bento 2×3, nudge, week). **Expanded/Large:** 3 columns: ring+hero | health bento 2×3 + nudge | session plan list (all moves, each with dose) + week.

### 7.2 Live setup (`#/live`)
Max **3 decisions, all pre-filled** — the user can press Start without touching anything.
1. **Duration** — chips `10 · 15 · 20 · 30 · 45` + a "Custom" chip that reveals a circular **dial** (5–60 min, 5-min detents, haptic tick per detent, keyboard ±5 via arrows). Default = `S.livePrefs.mins` or the plan's slot length.
2. **Energy** — 3-way segmented: Low · Okay · Good. Default from readiness. (Flare is *not* an energy option: pain ≥ 7 from check-in replaces this screen with the Relief preset and a calm explanation; "I'm in a flare" text-button also available.)
3. **Adjust** — collapsed chip row "No changes ▾" opening the 6 caveats (standing hurts, left/right touchy, knees, no bands, quiet). Default from yesterday + Travel mode.

Below: **session preview** = the compiled timeline bar (same component as the player scrubber) + "Warm-up 4 · Main 17 · Cool-down 4 min" + move list (collapsed to 3 rows). Changing any input recompiles live (≤ 16 ms; compile is pure). Primary button (sticky, accent): **"Start 25:00"**. Voice toggle (icon) next to it, remembered.

Wide: setup controls left (400 px), preview right with full move list.

### 7.3 Live timeline compiler (contract the player and voice rely on)
`compileTimeline(workout, minutes, prefs) → Segment[]`, pure, unit-tested.
```js
Segment = { id, kind: 'intro'|'brief'|'countdown'|'work'|'switch'|'rest'|'transition'|'milestone'|'outro',
  phase: 'warm'|'main'|'cool', exId, set, sets, side: 'L'|'R'|null, reps, repSec, tempo:[ecc,hold,con,pause]|null,
  hold, dur /* seconds, integer */, t0 /* session offset */, voice: VoiceEvent[] /* filled by coach engine */ }
```
Defaults: intro 20 s · brief 8 s (14 s the first time a move appears in a session) · countdown 3 s · switch 6 s · inter-set rest 20 s (holds/activation) / 35 s (band strength) / +10 s if energy Low · transition between moves 20 s (includes preview) · outro 45 s. Rep work = `reps × repSec` (repSec from tempo, default 4 s; holds-per-rep = hold + 2 s reset). Per-side moves expand L/R with the weaker side (from findings) **first** and getting the extra set.
Budget: warm-up 15 % (min 2 min), cool-down 12 % (min 2 min, ≥ 15-min sessions), main = rest. Fit order when over: (1) drop sets beyond the minimum on lowest-priority main moves, (2) drop lowest-priority moves, (3) shrink rests to floor (15 s). Never shorten a prescribed hold, tempo, or per-side pairing; never drop a Priority-finding move before an accessory. When under: add sets up to dose max → add accessory from plan → extend cool-down breathing. Final total within ±20 s, then the cool-down breathing segment absorbs the remainder so the display reads exactly the chosen time. Safety filter (invariants 1–3, 5) runs again on the compiled list.

### 7.4 Live player (`#/live/play`, full-screen, always dark)
**Phone portrait:**
- **Top bar** (glass-thin, 48 px): Close (→ pause sheet, never exits directly) · phase label ("Main · 2 of 3") · time remaining (tnum).
- **Ring** (min(78vw, 46vh)): giant countdown numerals inside; under the numerals: "hold" / "rest" / "rep 4 of 8".
- **Exercise name** (`--t-title-1`) · line 2: "Set 2 of 3 · Left side" (side icon) · line 3: **caption** of the current voice line (`--t-callout`, 2 lines max, fades 2.5 s after speech ends).
- **Next-up chip** (glass-regular): pose glyph + "Next: Side plank · R" + time until.
- **Timeline scrubber** (full width, 28 px touch height, 6 px visual): drag or tap jumps to segment starts only (snaps), with a preview tooltip; jumping backwards never re-logs.
- **Control bar** (glass-regular, 96 px): Back (48) · **Play/Pause (88 px circle, accent)** · Skip (48).
- **Secondary row** (glass-thin chips, 44 px): **Easier** · **+15 s** (rest/transition only; disabled otherwise) · Voice on/off · Volume (popover: voice slider, cues slider, "duck cues under voice" toggle) · **Pain** (coral outline, always present).

**Tablet landscape / desktop:** ring left half; right half: name, set/side, caption, next-up, move list for the session with the current one highlighted; scrubber + controls full width at bottom. Desktop shows the keyboard legend on `?`.

**Behaviour:**
- **Pause**: clock freezes, speech cancels, voice says "Paused." Resume: "Back in. {ex}, {side}." + countdown. Paused > 2 min during work → that set restarts with its brief.
- **Back**: to start of current segment; second press within 2 s → previous segment.
- **Skip**: next segment; skipping a work segment marks that set *skipped* (no data).
- **Easier**: swaps the move to its regression for all remaining sets (applies to today's session — invariant 6); voice confirms; logged as regression, not failure.
- **Pain**: pauses and opens the Pain sheet: "What are you feeling?" → **Sharp, or anything down the leg** (stop this move; offer Easier or Skip; if it's the second time this session, offer "Finish with a gentle cool-down") · **Achy but OK** (continue, note logged) · **Numbness, weakness, or bladder/bowel changes** (stop session; show red-flag copy: seek urgent care). Logged with segment id.
- **Resume after interruption**: state persisted every segment boundary (`S.live.run`); app relaunch shows "Resume at Bird-dog, set 2 (14 min left)".
- **Media Session**: metadata = exercise name / "Set 2 · Left" / BackForge artwork; actions play, pause, nexttrack (skip), previoustrack (back), seekforward (+15 s in rest). Owned through a looping silent `<audio>` started on the Start gesture.
- **Wake Lock**: acquired on start, re-acquired on `visibilitychange`, released on pause > 2 min and on finish.
- **Background/locked**: the engine clock is timestamp-based; on return it resyncs to the correct segment and the voice says "We're on {ex}, {side}." Tell the user once (setup screen footnote): "Keep the screen on for voice."

### 7.5 Live finish
Ring closes to a check → gold bloom. Content: "Session done." + **specific praise** (from the session: longest hold, sets completed, a move done on the weaker side) · stats row: time · moves · sets · regressions used (framed positively) · **Pain now** large 0–10 scale with pre-session value shown as a marker and the delta stated in words ("1 point lower than when you started") · "Any leg symptoms?" Yes/No · **Save** (accent). After save: streak update, week dots, optional quote (one line), "Back to Today". Skipping pain is allowed (no data), never defaulted.

### 7.6 Moves
Sticky glass-thin header: search (48 px, `/` focuses on desktop) + filter chips (All · Core · Hips · Bands · No band · Posture · Desk · Helps me). Pinned first row "Start here: McGill Big 3" (video). Rows: pose glyph 44 px · name · dose · band tag · verdict dot (Helps/Watch, with text on detail). Medium: 2-column grid of rows. Expanded: list 360 px + detail pane.
**Exercise detail sheet**: glyph + name (`vt-ex-*`), dose, band level stepper, **Setup** (1 line) and **Focus** (1 line) — the exact cues the voice coach uses — then "More cues" (≤ 3) and "Common mistakes" (≤ 2) collapsed, Regression / Progression rows (each tappable to its own detail), verdict + evidence line, safety tags ("Extension-free", "No loaded flexion"), **Watch video** (verified embed or labelled source links; never fake an embed), **Add to today**, **Preview voice** (speaks the brief).

### 7.7 Progress
Segmented (glass-thin, sticky): **Overview · Health · Body · Posture**.
- **Overview**: consistency heatmap (17 weeks × 7 days) · pain trend (14/30/90 toggle, fixed 0–10, 7-day average line, session days as ticks) · sessions/week bars · gate card (verdict + 4 pass/hold rows) · "Coach learned" (top 3 Helps, top 2 Watch).
- **Health**: bento of 6 tiles (as Today) with sparklines → tap opens full chart in a sheet/pane: Steps, Sleep (last-night hypnogram + 14-night stacked stages), Resting HR + HRV (baseline bands), Zone 2 (weekly vs 150), Sync card (last sync, Sync with Muse flow, Pause/Delete under "Manage").
- **Body**: weight (dots + EWMA + plan projection), waist (weekly), calorie/protein plan card, weight-vs-pain (honesty floor copy kept).
- **Posture**: band-check grades over time (letter chips per area per date), photo-check history (thumbnails from vault), assessment history; "Retake" → Check-ups.
Wide: segment content as a 2-column chart grid.

### 7.8 You
Grouped list rows (52 px, label · value · chevron), glass-regular groups: **Profile** (name, avatar) · **Check-ups** (4 rows with last date/grade) · **Coach** (voice: choose + preview, speed 0.9/1.0/1.1, chattiness: Quiet/Standard/Full, countdown: voice/tones, tempo click on/off) · **Sound** (cue volume, haptics) · **Appearance** (System/Dark/Light, Reduce motion, Solid surfaces) · **Modes** (Work/Travel, daily reminder) · **Data** (backup ritual, export JSON/CSV, health sync manage, demo data, erase) · **Privacy & PIN** · **About** (safety & scope sheet, references, roadmap, version).

---

## 8. Voice coach protocol

### 8.1 How elite coaches and physios actually run a session (the model we encode)
1. **Arrival**: name, one check-in fact, today's single goal, one safety line. < 20 s.
2. **Brief before movement**: name the move, **one setup cue, one focus cue — never more than two cues before movement**. Demonstrate (here: glyph/video) rather than talk.
3. **Count in** cleanly; then **silence for the first few seconds** while the client finds the position.
4. **One cue at a time during work**: form cue early (~⅓), encouragement late (~⅔), countdown at the end. External/outcome-focused cues beat internal anatomy lectures ("reach long" > "activate your multifidus").
5. **Rest is coaching time**: specific praise for what just happened, recovery breathing, then a preview of the next move with its setup cue so the client is in position when the clock starts.
6. **Modify without judgement**: the easier version is presented as the smart option, offered *before* form fails, never as a consequence.
7. **Check symptoms like a physio**: specific ("anything travelling down the leg?"), not generic ("how are you feeling?"). Stop rule is about the move, not the session.
8. **Mark the journey**: halfway, last exercise, last set.
9. **Close**: specific praise, down-regulating breathing, log pain, one line about next time.

### 8.2 Tone rules
- Warm, direct, **second person**, present tense, **short sentences (≤ 12 words)**, contractions. Sounds like a calm physio who also coaches strength.
- Praise is **specific** (names the move, side, hold, or quality) or not said.
- **Banned**: crush, smash, beast, burn, destroy, kill it, no pain no gain, push through (pain), feel the burn, easy *as a difficulty judgement* ("this one's easy"; "easy breaths" is fine), just, simply, perfect, guys, champ; any medical claim: fix, cure, heal, treat, diagnose, repair, realign, "good for your disc", "protects your spine". Never mention weight loss mid-session. Never comment on body shape.
- Pain language is neutral and specific: "sharp", "travelling down the leg", "tingling", "numb". Never "it's normal to hurt".
- Energy follows energy setting: Low → fewer encouragement lines, slower rate (0.95); Good → Standard.

### 8.3 Variety rules
- Each category is a **shuffle bag**: draw without replacement; refill when empty; never draw any of the last 3 used in that category.
- **No identical utterance twice within 10 minutes** (session-level LRU of rendered strings).
- Prefer templates whose placeholders can be filled with *specific* data (side, hold, set count, longest hold) over generic ones (weight 3:1).
- Exercise-specific lines (from `exercise.voice`) beat category lines when present.

### 8.4 Timing rules (the scheduler)
- **Word budget per window** = `floor(seconds × 2.3)` at rate 1.0 (× 2.1 at 0.95). If a line exceeds its window, try a shorter template from the same category; if none fits, drop it.
- **Priority** (higher pre-empts lower, lower is dropped not delayed): 1 Safety · 2 Countdown/Go · 3 Brief (name + setup) · 4 Side switch · 5 Form cue · 6 Rest preview/position · 7 Milestone · 8 Praise · 9 Encouragement · 10 Breathing filler.
- **Quiet zones**: no speech in the **last 3.2 s of any segment** (reserved for ticks or the spoken count) and **the first 1.5 s after "Go"**.
- Never start an utterance that won't finish 0.3 s before the next quiet zone. Utterance end is estimated from words ÷ rate, corrected by `onend` measurement (rolling average per voice).
- Max one utterance in flight; `speechSynthesis.cancel()` before priority ≤ 2 lines. Split any line > 18 words into sentences (Chrome truncates long utterances).
- **Spoken countdown** (setting "voice"): one utterance "Three, two, one, go." scheduled to *start* at T−3.4 s. If `onstart` fires > 400 ms late, cancel it and play tone ticks for the remainder. The engine clock is truth; voice is decoration. Setting "tones": 3 ticks + go tone, voice silent.
- Chattiness: **Quiet** = safety, brief (name only), countdown, side switch, milestones. **Standard** = all categories, encouragement on sets ≥ 20 s. **Full** = + breathing fillers and tempo calls on every rep.

### 8.5 Session script (what fires when)
| Moment | Lines (category, window) |
|---|---|
| Intro (20 s) | `greet` → `goal` → `safety` (always, Quiet included) → "First up: {ex}." |
| Brief (8–14 s) | `brief` (name + setupCue) → `focus` (focusCue) |
| Countdown (3 s) | `count` / tones |
| Work start | `go` word is part of count; then silence 1.5 s |
| Work ⅓ | `form` (uses exercise focus/cues[1..]) |
| Work ⅔ (≥ 20 s sets) | `encourage` |
| Hold work | `hold` at start ("Hold."), `breath` at midpoint for holds ≥ 15 s, `final` at T−6 |
| Rep work | `tempo` calls for reps 1–2 (Full: all), then rep numbers on the concentric; `remaining` at 2 and 1 reps left |
| Switch (6 s) | `switch` |
| Rest (t0) | rest tone → `praise` (≤ 8 words) |
| Rest t0+4 | `recover` (breathing) if rest ≥ 25 s |
| After 1st set of a new or Priority move | `paincheck` (once per move per session) |
| Rest/transition T−12 | `preview` (next ex + setupCue) |
| T−6 | `position` |
| First segment past 50 % of session time | `halfway` + chime |
| Last main move starts | `lastmove` |
| Last set of a move | `lastset` (instead of `form`) |
| Easier pressed | `regress_ack`; also `regress_offer` proactively on a rest after any set marked "skipped" or after a Pain=Achy |
| Pain sheet → Sharp/leg | `pain_stop` (priority 1) |
| Cool-down start | `cooldown` |
| Outro (45 s) | `close` → `breath_down` → `logpain` |
| Pause / resume | `pause` / `resume` |

### 8.6 Placeholders (whitelist; the linter rejects anything else)
`{name}` first name · `{ex}` exercise name (spoken form, `exercise.say` if set) · `{side}` "left"/"right" · `{otherSide}` · `{set}` `{sets}` · `{reps}` `{repsLeft}` · `{sec}` hold seconds · `{setupCue}` `{focusCue}` `{cue}` (from exercise) · `{next}` next exercise · `{nextSetup}` · `{minutes}` session length · `{minsLeft}` · `{moves}` move count · `{goal}` today's goal phrase · `{pain}` check-in pain · `{sleepPhrase}` ("a short night", "a solid night") · `{loadPhrase}` ("a steady session", "a lighter session") · `{longest}` longest hold · `{regression}` regression name · `{weakSide}`.

### 8.7 Line library (seed set; ≥ 15 per category; word limits in brackets)

**greet** [≤ 14]: "Hey {name}. Good to see you." · "Morning, {name}. Let's get moving." · "Evening, {name}. Short and steady tonight." · "{name}, welcome back." · "Hi {name}. You showed up — that's the hard part." · "Right, {name}. Let's do this properly." · "Good to have you, {name}." · "Hey {name}. Phone propped up? Good." · "{name}. Mat down, bands close. Let's go." · "Welcome in, {name}." · "Hey {name}. {minutes} minutes, all mapped out." · "Hi {name}. Settle in." · "Good timing, {name}." · "There you are, {name}." · "Let's get to work, {name}."

**goal** [≤ 22]: "You said pain is {pain} and you had {sleepPhrase}, so this is {loadPhrase}." · "Today's goal: {goal}." · "{minutes} minutes, {moves} moves. Quality over speed." · "Today is about control, not effort." · "We're building endurance today — long, calm holds." · "Goal today: smooth reps and steady breathing." · "Lighter load today. That's the plan, not a downgrade." · "Today we work your {weakSide} side a little more." · "Hips and core today. Nothing loaded through your spine." · "Easy pace today. Consistency is the win." · "{loadPhrase} today. I'll call everything — you move." · "Today's focus: {goal}. Everything else is a bonus." · "We'll warm up, do the main work, then wind down." · "{minutes} minutes. I'll tell you every change." · "Nothing heroic today. Clean reps, good breathing."

**safety** [≤ 22, priority 1, always said]: "One rule: sharp pain or anything down your leg, tap Pain. We change the move." · "If something feels sharp or travels down the leg, stop that move. Tap Pain." · "Ache is fine. Sharp pain or tingling isn't — tap Pain and we'll swap it." · "Anything running down the leg ends that move, not your session." · "Stay in the comfortable range. Sharp pain means stop that move." · "If your back says no, tap Pain. There's always an easier version." · "Tingling, numbness or sharp pain — stop the move and tap Pain." · "Work where it feels strong. Sharp means stop." · "You're in charge of range. Pain button's always on screen." · "Effort is welcome. Sharp pain isn't. Tap Pain if it shows up." · "Anything that travels into the leg: stop, tap Pain." · "Move within comfort today. I'll offer easier versions anytime." · "If a move feels wrong, it is. Tap Pain or Easier." · "Mild effort, yes. Sharp or spreading pain, stop that move." · "Quick reminder: Pain button bottom right. Use it freely."

**brief** [≤ 16]: "{ex}. {setupCue}." · "Next move: {ex}. {setupCue}." · "{ex}, {side} side. {setupCue}." · "Let's do {ex}. {setupCue}." · "Up now: {ex}. {setupCue}." · "{ex}. Set {set} of {sets}. {setupCue}." · "This one's {ex}. {setupCue}." · "{ex}. Start on your {side}. {setupCue}." · "Here's {ex}. {setupCue}." · "{ex} — {setupCue}." · "Moving to {ex}. {setupCue}." · "{ex}. You know this one. {setupCue}." · "Time for {ex}. {setupCue}." · "{ex}, {reps} reps. {setupCue}." · "{ex}, {sec}-second holds. {setupCue}."

**focus** [≤ 12]: "Focus: {focusCue}." · "Think: {focusCue}." · "Key thing: {focusCue}." · "{focusCue}. That's all." · "One cue: {focusCue}." · "Keep it simple — {focusCue}." · "Your job: {focusCue}." · "Watch for this: {focusCue}." · "{focusCue}. Smooth." · "All about this: {focusCue}." · "Remember, {focusCue}." · "{focusCue}, every rep." · "Lead with this: {focusCue}." · "Only one thing: {focusCue}." · "{focusCue}. Nice and slow."

**count / go** [fixed form + go variants, ≤ 6]: "Three, two, one, go." · "Three, two, one, and go." · "Three, two, one, begin." · "Three, two, one, lift." · "Three, two, one, reach." · "Three, two, one, brace and go." · "Three, two, one, press." · "Three, two, one, hold." · "Three, two, one, start." · "Three, two, one, move." · "Three, two, one, breathe and go." · "Three, two, one, up." · "Three, two, one, pull." · "Three, two, one, off you go." · "Three, two, one, here we go." *(go word must match the move's `goWord` if set: lift/reach/press/pull/hold.)*

**form** [≤ 12]: "{cue}." · "Nice. {cue}." · "Check in: {cue}." · "{cue} — keep it there." · "Stay with it. {cue}." · "Good. Now {cue}." · "Small fix: {cue}." · "Keep your ribs down." · "Neck long, chin gently tucked." · "Pelvis level. No rocking." · "Slow it down a touch." · "Let the hips do the work." · "Shoulders away from your ears." · "Keep the band tension even." · "Stay tall through the crown of your head."

**encourage** [≤ 10]: "That's steady. Keep it." · "Good control. Stay there." · "You're holding this well." · "Nice and smooth." · "This is the part that counts." · "Strong position. Keep breathing." · "Good. Same again." · "You've got this one." · "Looks solid. Stay with it." · "Calm and steady wins this." · "That's the quality we want." · "Breathe. You're doing it." · "Good work on the {side} side." · "Hold the shape. Nearly there." · "This is you getting stronger."

**final** [≤ 4, said at T−6]: "Five seconds." · "Last five." · "Five more." · "Final five." · "Five, stay strong." · "Last few seconds." · "Almost there." · "Five left. Hold it." · "Nearly done." · "Finish strong." · "Five. Stay smooth." · "Home stretch." · "Last five, breathe." · "Hold it. Five." · "Five more, steady."

**switch** [≤ 10, 6 s window]: "Switch. {side} side now." · "Other side. Same setup." · "Swap to the {side}." · "And switch. {side} side." · "Change sides. Take a breath." · "{side} side now. Same cue." · "Switch over. Same quality." · "Now the {side}. Match it." · "Swap sides. Reset your brace." · "Other side. Slow setup." · "{side} side. You know the drill." · "Switch. Find your position." · "Turn around. {side} side." · "Good. {side} side next." · "Change over. No rush."

**tempo** [per rep, ≤ 3 per call]: "Up." · "Hold." · "And down." · "Slowly down." · "Reach." · "Return." · "Press." · "Squeeze." · "Lower." · "Pull." · "Back." · "Lift." · "Pause." · "Reset." · "And breathe." *(+ rep numbers "one" … "fifteen" on the concentric; `remaining`: "Two more." · "Last one." · "One more, slow." · "Final rep.")*

**hold** [≤ 6]: "Hold." · "And hold it there." · "Hold. Breathe." · "Lock it in." · "Stay." · "Hold steady." · "Freeze there." · "Hold that shape." · "Keep it. Breathe." · "Hold and relax your face." · "Hold. Long spine." · "Stay right there." · "Hold. Easy breaths." · "And hold, nice." · "Steady hold."

**breath** [≤ 10]: "Breathe out as you lift." · "Exhale on the effort." · "Brace gently, keep breathing." · "Don't hold your breath." · "Slow breath in through the nose." · "Long breath out." · "Breathe behind the brace." · "Easy breaths. In and out." · "Exhale and reach a little longer." · "Breathe into your sides." · "Keep the breath moving." · "Brace like you're about to be nudged." · "Soft exhale, ribs down." · "Breathe low and slow." · "Let the breath set the pace."

**praise** (rest, specific) [≤ 8]: "Nice — {sec} seconds, rock solid." · "That {side} side looked steady." · "Clean reps. Good control." · "Set {set} done. Nicely paced." · "Good. That was smooth." · "Strong hold on the {side}." · "That's {set} of {sets}. Well done." · "Nice. No rushing." · "Good set — even both sides." · "Solid. Your pelvis stayed level." · "That was patient work." · "Good. That's the standard." · "Nice breathing through that." · "Well controlled. Take your rest." · "Good job on the {weakSide} side."

**recover** [≤ 12]: "Shake it out. Breathe in for four." · "Long breath out. Let your shoulders drop." · "Rest. Slow breaths." · "Breathe in through your nose, out through your mouth." · "Loosen up. Let the heart rate settle." · "Rest easy. You've earned it." · "Relax your jaw. Breathe." · "Take a sip of water if you need it." · "Slow exhale. Let everything soften." · "Rest. Nothing to do right now." · "Roll your shoulders. Breathe low." · "Easy breathing. Reset." · "Let your back relax." · "In for four, out for six." · "Recover. I'll call the next move."

**paincheck** [≤ 16]: "Quick check: anything sharp, or down the leg? If so, tap Pain." · "How did that sit? Sharp or tingling means tap Pain." · "Check in with your back. Achy is OK; sharp isn't." · "Anything travelling into the leg? Tap Pain and we'll swap it." · "Body check. All good? Keep going. Sharp? Tap Pain." · "First set done. Any sharp pain? Let me know with Pain." · "Notice anything down the leg? Tap Pain." · "Was that comfortable range? If not, tap Easier." · "Quick scan: back OK, legs OK? Good." · "Sharp, burning or tingling — tap Pain." · "If that felt pinchy, tap Easier for the next set." · "Any symptoms in the leg? Stop and tap Pain." · "Back feeling OK? Achy's normal effort. Sharp isn't." · "Check in. If anything spread, tap Pain." · "All good? If not, the easier version's one tap away."

**preview** [≤ 16, T−12]: "Next: {next}. {nextSetup}." · "Coming up, {next}. {nextSetup}." · "{next} next. {nextSetup}." · "After this: {next}. {nextSetup}." · "Next move, {next}. {nextSetup}." · "Get ready for {next}. {nextSetup}." · "Up next, {next}, {side} side first." · "{next} is next. {nextSetup}." · "In a moment, {next}. {nextSetup}." · "Next we do {next}. {nextSetup}." · "{next} coming. {nextSetup}." · "Then {next}. {nextSetup}." · "Next one's {next}. {nextSetup}." · "Lining up {next}. {nextSetup}." · "Heading into {next}. {nextSetup}."

**position** [≤ 6, T−6]: "Get into position." · "Set up now." · "Find your start position." · "Get set." · "Into position." · "Get ready." · "Set your brace." · "Take your spot." · "Band ready, get set." · "Settle into it." · "Position, please." · "Set up. Breathe." · "Ready position." · "Get comfortable. Here we go." · "Find your setup."

**regress_offer** [≤ 16]: "If that felt like a fight, tap Easier. Same benefit, less strain." · "Want the easier version next set? Tap Easier." · "There's a gentler version — {regression}. One tap." · "Easier is a smart choice today, not a step back." · "If form slipped, tap Easier. Quality first." · "{regression} works the same idea. Tap Easier anytime." · "Option: tap Easier for {regression}." · "Feeling heavy today? Easier is right there." · "Good reps beat hard reps. Easier's available." · "Try {regression} if that felt pinchy." · "Tap Easier if you want a smaller range." · "Today might be an Easier day. That's fine." · "Easier keeps you training. That's the point." · "Your call: same move, or {regression}." · "No shame in Easier. It still counts."

**regress_ack** [≤ 10]: "Done. {regression} for the rest of this one." · "Switched to {regression}. Good call." · "Easier version on. Same focus." · "Smart choice. {regression} now." · "Got it. {regression} from here." · "Easier it is. Keep the quality." · "Swapped. This still does the job." · "{regression}. Nice and controlled." · "Good decision. Carry on." · "Changed. You're still training." · "Easier set loaded." · "{regression} it is. Same breathing." · "OK. Smaller range, same intent." · "Done. Listen to your body — good." · "Switched. No change to your streak."

**pain_stop** [priority 1, ≤ 20]: "Stop that move. We'll skip it today." · "OK, stopping that one. Breathe easy." · "Good call stopping. Let's switch to {regression}." · "Stopping. If the leg symptoms stay, rest and check with your physio." · "That move's done for today. The session goes on." · "Stop there. Lie comfortably and breathe." · "We'll leave that one. Your back comes first." · "Fine. Skipping ahead to something gentler." · "Stopped. Let's take thirty seconds to breathe." · "Thanks for telling me. We'll change course." · "That's out for today. Next move's lighter." · "Stop. Find a comfortable position." · "Leg symptoms mean we stop that move. Good decision." · "If numbness or weakness appears, stop the session and get checked." · "Let's finish with a gentle cool-down instead."

**halfway / lastmove / lastset** [≤ 10 each]: halfway: "Halfway. Nice work." · "That's half. Same quality now." · "Halfway there, {name}." · "Half done. Keep it steady." · "Halfway. {minsLeft} minutes to go." · "Past halfway. Good rhythm." · "That's the halfway mark." · "Halfway. Breathing's looking good." · "Half the work's in the bank." · "Halfway. Stay patient." · "Halfway. The second half builds the habit." · "Halfway. Same focus." · "Over the hump." · "Halfway — you're on track." · "Half done. Nice and consistent." — lastmove: "Last move of the main block." · "Final exercise. Make it count." · "Last one before the cool-down." · "This is the last main move." · "Final move. Quality to the end." — lastset: "Last set." · "Final set of {ex}." · "Last set. Finish clean." · "Final round." · "Last set on this one."

**cooldown** [≤ 14]: "Cool-down. Slow everything down now." · "Main work's done. Time to wind down." · "Cool-down. Breathe and let it settle." · "Easy now. Gentle movement only." · "Main block complete. Let's cool down." · "Wind down. Long, slow breaths." · "That's the work done. Now we recover." · "Cool-down time. Soft and slow." · "Bring the pace right down." · "Last part. Breathing and gentle moves." · "Cool-down. Nothing to prove here." · "Slow it down. Let your back relax." · "Let's bring the heart rate down." · "Easy finish. Gentle range." · "Cool-down. You did the hard part."

**close** [≤ 16]: "That's it, {name}. {moves} moves, all controlled." · "Done. Your longest hold was {longest} seconds." · "Session complete. Your {weakSide} side got extra work today." · "Finished. {minutes} minutes, start to end." · "That's the session. Steady from start to finish." · "Done. You stayed in control the whole way." · "Good session, {name}. That's another one banked." · "All done. Smart choices on the hard moves." · "Session complete. Breathing was great today." · "That's it. You showed up and did the work." · "Done, {name}. Consistent sets throughout." · "Finished. Every set counted." · "Complete. Nice patience on the holds." · "Session done. Quality all the way." · "That's today done. Well paced."

**breath_down** [≤ 14]: "Lie back. Breathe in for four." · "Out for six. Let your back sink." · "Hands on your belly. Slow breaths." · "In through your nose. Long breath out." · "Let your whole body get heavy." · "Three more slow breaths." · "Relax your jaw, shoulders, hands." · "In for four, hold for two, out for six." · "Let the floor take your weight." · "Breathe into your lower ribs." · "Slow it all down." · "Last long breath out." · "Feel your back settle." · "Easy breaths. Nothing to do." · "One more slow breath."

**logpain** [≤ 14]: "Before you go, rate your pain, zero to ten." · "Tap your pain score now. It shapes tomorrow." · "Quick pain score, then you're done." · "How's the back now? Tap a number." · "Log your pain — it helps me plan tomorrow." · "One tap: pain, zero to ten." · "Rate how your back feels now." · "Pain score, please. Then rest up." · "Tell me how it feels now, zero to ten." · "Last thing: your pain score." · "Score your back now. It guides your progression." · "Log it, and that's the session saved." · "How did your back respond? Tap a number." · "Quick check-out: pain score." · "Tap a number and you're finished."

**pause / resume** [≤ 8]: pause: "Paused." · "Paused. Take your time." · "Paused. I'll wait." · "Paused. Back when you are." · "Holding here." — resume: "Back in. {ex}, {side}." · "Here we go. {ex}." · "Resuming {ex}." · "Picking up at {ex}." · "Welcome back. {ex}, set {set}." · "Let's continue. {ex}." · "Back to it. {setupCue}." · "Resuming. Get into position." · "We're on {ex}, {side} side." · "Continuing with {ex}."

### 8.8 Audio-cue design (Web Audio, synthesized, one shared `AudioContext` unlocked on the Start gesture)
| Cue | Spec | When |
|---|---|---|
| Tick | sine 880 Hz, 70 ms, 4 ms attack, exp decay, −18 dBFS | T−3, T−2, T−1 (tones mode) |
| Go | two-tone up 660 → 990 Hz, 90 + 140 ms, triangle, −14 dBFS | segment start of work |
| Rest | down 784 → 523 Hz, 260 ms, soft triangle, −18 dBFS | work → rest |
| Switch | double soft tick 1046 Hz, 2 × 50 ms, 80 ms gap | side switch |
| Halfway chime | C6–E6–G6 bell (sine + 2nd partial at −12 dB), 600 ms decay | 50 % mark |
| Finish | C5–E5–G5–C6 arpeggio + shimmer noise 300 ms | outro start |
| Tempo click (optional) | filtered noise burst 20 ms, bandpass 2 kHz, −24 dBFS | each tempo phase |
| Pain/safety | none — silence is calmer; visual + voice only | |
Bus: `cues → duckGain → master`; `duckGain` ramps −9 dB (60 ms) on `utterance.onstart`, back on `onend` + 150 ms. Separate user volumes for voice (`utterance.volume`) and cues (master gain). Haptics (`navigator.vibrate`): go 40 ms · rest 20-60-20 · finish 30-50-30-50-120. Other apps' music cannot be ducked from the web; iOS/Android system TTS ducking applies where the platform does it — say so in Coach settings.

**Voice selection:** on first Live start, rank `speechSynthesis.getVoices()` for `en-*` by name containing Natural/Neural/Premium/Enhanced/Google, then `localService`; user can override and **Preview** in You → Coach. Warm-up utterance (empty string) on the Start gesture for iOS. Rate 1.0 (briefs 0.95), pitch 1.0.

---

## 9. Responsive & input

- **Shell** breakpoints = §4.3 viewport classes. **Components** use container queries: every card/screen region declares `container-type: inline-size` with a name (`today-col`, `hero`, `bento`, `player`). Component breakpoints: `@container (width >= 420px)` (2-up internals), `>= 640px` (side-by-side hero), `>= 900px` (3-up bento).
- **Player** uses `@container player (aspect-ratio > 1.2)` for the landscape split, independent of device. Tablet landscape is a first-class layout, tested at 1180×820 and 1366×1024.
- **Touch targets**: ≥ 44 × 44 everywhere; ≥ 56 for primary buttons; player play/pause 88; scrubber 28 px hit height. 8 px min spacing between targets on the player. Bottom 25 % of the phone is where all player controls live (thumb zone).
- **Safe areas**: `env(safe-area-inset-*)` on tab bar, player, sheets; `100dvh` not `100vh`.
- **Keyboard (desktop/tablet with keyboard)** — global: `1`–`5` destinations, `/` search Moves, `L` open Live setup, `?` shortcut sheet, `Esc` close sheet. Player: `Space` play/pause · `→` skip · `←` back · `E` easier · `R` +15 s rest · `V` voice on/off · `↑/↓` voice volume · `P` pain sheet · `C` captions on/off · `F` fullscreen · `Esc` pause sheet. Shortcuts are ignored while focus is in a text field. All listed in the `?` sheet.
- **Pointer**: hover states only under `@media (hover:hover)`; list-detail panes on expanded.
- **Headphone/hardware**: Media Session actions (§7.4).

---

## 10. Accessibility

- **Contrast on glass**: text on glass must pass 4.5:1 (body) / 3:1 (≥ 24 px or 19 px bold) against the **worst case** = glass bg composited over the ambient's lightest point. Guaranteed by: Regular/Thick for text, ambient L cap (§5.3), and a harness check (`dev/contrast-check.mjs`) that composites tokens and fails CI below threshold. Accent buttons use `--c-on-accent` (≥ 7:1).
- **Reduced transparency**: §5.4 fallbacks; also auto-enabled when `prefers-contrast: more`.
- **Player live regions**: `#live-caption` `aria-live="polite"` mirrors every spoken line (so screen-reader users get the coach as text); `#live-status` `aria-live="assertive"` only for safety lines, pause, and segment changes ("Bird-dog, left side, 30 seconds"). Countdown numerals are `aria-hidden`; a visually hidden timer announces only at 10 s and segment end. Do not announce every second.
- **Captions**: on by default; every voice line appears on screen as text; caption toggle `C`. Voice-off still shows captions and plays tones — the session is fully usable deaf or muted.
- **Focus**: player DOM is persistent (Preact diffing, no `innerHTML` swaps), focus stays on the control that was used. Sheets/popovers: focus trap, `Esc`, return focus. Visible focus ring: 2 px `--c-accent` + 2 px offset, on glass also a 4 px `--c-bg` halo.
- **Semantics**: tab bar `nav` + `aria-current="page"`; segmented controls `role="tablist"` with arrow keys; pain scale = radiogroup of 11 with labels "0, no pain" … "10, worst imaginable"; charts `role="img"` + sentence + data table in sheet; grades never colour-only (letter always).
- **Motion/vestibular**: §6.4. **Cognitive**: one primary action per region; plain language at reading age ~10 in UI copy.
- **Text scaling**: layout survives 200 % zoom; type in `rem`; player numerals clamp but never overflow the ring.

---

## 11. Demo-data showcase

`?demo=1` (or You → Data → **Preview with demo data**) loads a deterministic generator `dev/demo-data.mjs` (seeded PRNG, seed in URL `&seed=`) into a **separate key `backforge_demo`** — real state is never read or written while the "Demo data" glass banner is shown. 120 days, story arc: weeks 1–3 pain 5–6 and 3 sessions/wk; one flare in week 5 (pain 7 for two days → relief sessions); steady build to 5–6 sessions/wk; pain settles to 2–3; weight 84 → 80.5 kg with sparse weigh-ins; steps 4–11 k with weekday desk dips; sleep 5.5–8 h with stages; RHR drifting 64 → 59; HRV 38 → 47 ms; Zone 2 80 → 160 min/wk; two movement assessments (day 1, day 60) and three band checks showing grade improvements; 4 photo checks (placeholder silhouettes).

What appears with rich data:
- **Today**: readiness "Ready 82" with contributors; full health bento with Δ vs baseline arrows; streak 23.
- **Progress → Overview**: 17-week heatmap filling in; pain 90-day trend with flare visible and recovery; sessions/week climbing; gate "Ready to promote: Bird-dog band level 2".
- **Health**: sleep hypnogram + 14-night stages; RHR/HRV lines with baseline bands; Zone 2 weekly bars crossing the 150 line in week 9.
- **Body**: weight dots + EWMA + projection to goal date; weight-vs-pain with honest strength tier.
- **Posture**: grade chips C → B on pelvis and head over three checks.
- **Insight cards** (max 3, each with n and confidence language): "Pain averaged 1.1 lower in weeks with 4+ sessions (n = 12 weeks). Association, not proof." · "After nights under 6 h, next-day pain ran +0.8 (n = 14 nights)." · "Bird-dog sessions preceded pain drops 9 of 12 times." Any comparison with n < 5 is labelled "early signal". No insight appears with n < 3.
- **Live finish**: shows pain delta history (last 10 sessions pre vs post as paired dots).

---

## 12. Maintainability rules (for Muse and any future builder)

### 12.1 File layout (as built in v4.5 — supersedes the draft `src/` layout)
```
index.html                 shell only: styles, <script type=module src=app/js/main.js>, #app, ambient div
manifest.webmanifest, sw.js
app/vendor/                htm-preact.mjs (Preact + hooks + htm), fonts/ — pinned in app/vendor/VERSIONS.md
app/css/                   tokens.css (ALL tokens), app.css (base · materials · layout · components · screens), player.css
app/js/main.js             boot, shell, PIN gate, prefs, shortcuts
app/js/store.js            state load/normalise/save (backforge_v1, lossless), demo key, health import validator
app/js/router.js           hash router + View Transitions
app/js/data.js             loads data files, health series, insights
app/js/engine/             library.js (safety), dose.js, plan.js, live.js (builder), progress.js, context.js, dates.js
app/js/live/               compiler.js (timeline), coach.js (scheduler + render), player.js (clock), audio.js, voice.js, session.js
app/js/ui/                 icons.js, kit.js (Ring, Spark, LineChart, Bars, Seg, Sheet, PainScale)
app/js/screens/            today.js, live.js (setup · player · finish), moves.js, progress.js, you.js
data/                      exercises-desk.json, coaching.json (setupCue/focusCue live here), voice-lines.json, demo/
backend/data/exercises.json  canonical library (shared with the backend)
tests/                     node --test suites + smoke.browser.mjs (Playwright)
tools/                     make_demo_data.mjs, health_sync.py, one-off migrations
classic/index.html         the v4.0 app — hosts the check-ups until they are rebuilt
```
Deviations from this protocol, decided at build time: exercise doses stay strings (read by `engine/dose.js#prescribe`, covered by a test over every library entry) and structured `setupCue`/`focusCue` live in `data/coaching.json` — a structured `dose` object is a v4.7 data migration; the spoken 3-2-1 is tones-only for now (the voice countdown option is v4.7); voice lines live in `data/voice-lines.json` (not `lines.js`) so Muse edits data, not code; the lint rules in §12.4 are enforced by `tests/data.test.mjs` and `tests/live.test.mjs`.

### 12.2 Naming
- CSS custom properties: `--c-*` colour, `--g-*` glass, `--viz-*` data viz, `--sp-*` spacing, `--r-*` radius, `--t-*` type, `--d-*` duration, `--e-*` easing, `--elev-*`. **Only `tokens.css` defines them.** Components reference tokens; never raw `oklch()`/hex/px colours outside `tokens.css`.
- CSS classes: kebab-case, component-prefixed (`.player-ring`, `.today-hero`); state via attributes (`[data-state="rest"]`, `[aria-pressed]`), not modifier soup. Each component CSS file is wrapped in `@layer components` and `@scope (.component-root)` where nesting depth would exceed 3.
- JS: camelCase functions, PascalCase components, SCREAMING_CASE constants; exercise ids kebab-case and **never renamed** (they key `exLog`, `bandLevel`, `swaps`).
- View Transition names: `vt-*`, listed in §6.2 only.

### 12.3 Adding an exercise
Target shape for the v4.7 structured-dose migration (today: add to `backend/data/exercises.json` + cues in `data/coaching.json`, see AGENTS.md):
```js
{ id:'bird-dog', name:'Bird-dog', say:'bird dog', cat:'core', band:'none', pose:'bird-dog',
  dose:{ sets:3, reps:8, hold:8, perSide:true }, tempo:[2,8,2,0], goWord:'reach',
  setupCue:'Hands under shoulders, knees under hips', focusCue:'reach long, not high',
  cues:['Pelvis level, like a glass of water on your back','Sweep the floor to reset'],
  mistakes:['Arching to lift higher','Pelvis rotating open'],
  regression:'bird-dog-leg-only', progression:'bird-dog-band',
  safety:['extension-free','no-loaded-flexion'], voice:{ form:['Long line from hand to heel.'] },
  video:{ verified:null, search:['Squat University bird dog'] }, evidence:'McGill Big 3' }
```
Rules: structured `dose` (no more parsing strings; `doseText` is generated for display); `setupCue` ≤ 8 words, `focusCue` ≤ 6 words, both spoken-friendly (no symbols, no "×"); `regression` must reference an existing id (harness fails otherwise); `safety` tags are checked by the safety filter; run `node dev/harness-v5.mjs` (safety, compile-fit, regression links) before committing.

### 12.4 Adding voice lines
Append to the right category in `data/voice-lines.json`. Then `npm test` must pass: word limit per category, placeholder whitelist (§8.6), banned-word list (§8.2), no duplicate strings, category keeps ≥ 15 lines, sentences ≤ 12 words. Never edit `scheduler.js` to make a line fit — shorten the line.

### 12.5 Data imports (Muse)
Muse writes **files**, never `localStorage`: health sync JSON, photo-check verdicts, demo seeds. Import goes through the validators in `app/js/store.js`. Data-only commits start with `data:` and never touch `app/`. New persisted fields: default in `store.js` `normalise()` + a migration test with a seeded old payload.

### 12.6 Do / Don't
**Do**: use tokens; keep one primary action per region; put long copy in sheets; add a lesson-style "Why?" for any computed verdict; test at 360×740, 768×1024 portrait, 1180×820 landscape, 1440×900; check reduced motion + solid surfaces + light theme for every screen; keep the player DOM persistent; run harnesses before push; update README + CHANGELOG in the same push.
**Don't**: add a sixth destination; put glass on list rows or paragraphs; add inline `style=""` or `onclick`; use emoji as icons; create a second `AudioContext`; schedule speech outside the scheduler; add any medical-claim word; reprint the safety paragraph on every step; let a calendar or streak override a pain gate; reintroduce a banned movement through a swap, progression, or demo data; break exercise ids.
