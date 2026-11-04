# BackForge — Roadmap to v5.0

**Vision.** BackForge becomes the reference standard for self-guided back rehabilitation software: an assessment-led training system a physiotherapy clinic would be proud to hand to a patient, that an engineer would call boring in the best way — deterministic, testable, private by architecture — and that a chronic procrastinator actually opens every day.

**Where we are.** v1.0 (Oct 2026) proved the clinical core: 13-test assessment → findings engine → findings-driven plan → guided player → pain-gated progression. v2.0 (Nov 2026) proved the adherence core: Live Mode. v2.5 (Nov 2026) gives the coach a memory: readiness, response learning, streak repair, deload intelligence, weekly review, protein floor. Everything after this is scale — of data, of intelligence, of trust, of reach — in that order.

**Non-negotiable principles (every version, no exceptions).**

1. **Safety is a compile-time property, not a disclaimer.** The precautions (no loaded spinal flexion/twisting, never both knees to chest, extension-intolerance removes prone work, flare days run relief only) live in the plan generator's rules and are covered by automated tests. A feature that cannot prove it respects them does not ship.
2. **The plan is earned by assessment, never by calendar.** Progression gates run on pain trend + completion, always.
3. **Adherence beats intensity.** Every design review asks: does this lower the cost of starting? Micro counts. Never miss twice. The system motivates so the user doesn't have to.
4. **Private by architecture.** Data is the user's. Local-first by default; anything that ever leaves the device is explicit, encrypted, exportable and deletable.
5. **Evidence or it is decoration.** Every exercise, test and rule carries a checkable source. Influencer content is a lead, never an authority.
6. **One file until it hurts.** The single-file PWA stays until a feature genuinely cannot be built inside it; complexity must pay rent.

---

## v2.0 — LIVE MODE *(shipped Nov 1, 2026)*

**Theme: the workout that starts itself.**

- **Live workout partner.** Three taps — time on hand (5/10/20/35/50), body feel (great/okay/low/flare), caveats (standing hurts, either side touchy, sore knees, no bands, quiet) — build a complete session: warm-up → main work → cool-down. No other decisions exist.
- **Self-updating defaults.** The builder re-derives the default workout from (a) assessment findings and their severity, (b) per-exercise logged history (recency + novelty), (c) today's pain/sleep check-in, (d) the day's slot in the A/B/C + Zone 2 week. Every choice carries a plain-language "Why this workout?" receipt.
- **Partner player.** Set × side steps with coach cue per step, parsed hold timers, 45-second auto-rests, progress bar, one-tap regress ("modify, don't stop"), guilt-free skip (skip = no data), resume-after-interruption, celebration finish with a pain score that feeds the gates.
- **Motivation system.** Daily quote from a real, attributed person (Clear, Twain, Bruce Lee, Marcus Aurelius, Lombardi, Ali…); rotating coach notes built on proven behavior science (2-minute rule, don't-break-the-chain, implementation intentions, temptation bundling, future-self continuity, self-compassion research, identity voting); Seinfeld-chain week dots; milestone badges; specific praise on completion, never generic confetti text.
- **Exit criteria (met):** builder unit-tested across fresh/seeded states, all caveats, flare override; full session flow test green; safety invariants re-verified.

## v2.5 — THE COACH GETS A MEMORY *(shipped Nov 3, 2026)*

**Theme: from reactive defaults to a coach that notices.**

- **Readiness score.** Sleep + yesterday's pain response + session history → a single morning readiness call (full / trimmed / micro / relief) shown before any setup — Live Mode pre-answers its own questions.
- **Per-exercise response learning.** The app learns which exercises precede pain drops and which precede flares *for this user* (24-hour pain delta after sessions containing each exercise) and weights the builder accordingly — with the reasoning still shown, never hidden.
- **Smart streak repair.** A missed day triggers an automatic "repair session" offer (2 minutes, streak-preserving at reduced credit) instead of a broken chain — designed against the what-the-hell effect that kills habit apps.
- **Deload intelligence.** Two consecutive pain-rising weeks auto-propose a deload week; two pain-falling weeks surface the retest invitation.
- **Weekly review card.** One screen, Sunday-grade: sessions, pain trend, gate distance, one win, one adjustment. Exportable.
- **Nutrition lite.** Protein floor tracker (target from bodyweight, 1.6 g/kg) with quick-add gram logging; low-protein days flagged in the weekly review — tissue rebuilds on protein. *(Shipped Nov 3, 2026 with quick-add logging; photo-first logging deferred to a later version.)*
- **Exit criteria (met):** every adaptive weight change is explainable in one sentence in the UI; no black-box recommendations anywhere.

## v3.0 — THE BODY, CONNECTED *(target: Feb 2027)*

**Theme: the phone's sensors join the clinical picture.**

- **Health Connect sync via Muse.** Steps, Zone 2 heart-rate minutes, sleep duration/quality and weight flow in automatically (Google Fit and Samsung Health both land in Health Connect; Muse is the bridge — no new permissions empire inside the app).
- **Recovery-aware planning.** Zone 2 compliance and step counts join pain in the progression gate; a 9,000-step day plus poor sleep trims tomorrow before the user asks.
- **Weight & waist trends** on Progress, correlated (honestly, with confidence language) against pain trend.
- **Desk-day defense.** Long sedentary stretches (phone-detected) trigger the standing/posture micro-block as a Live session variant.
- **Data architecture step 1:** versioned state schema with migrations + an automated backup/export ritual (weekly JSON to a user-chosen destination). Still local-first.
- **Exit criteria:** sync is read-only, pausable, and fully deletable; zero data leaves the device without a named destination.

## v3.5 — EYES ON FORM *(target: Apr 2027)*

**Theme: the camera becomes a coach's eye.**

- **On-device pose estimation** (MediaPipe-class, runs locally — no video ever uploads): rep counting for the hinge pattern, bridge and Big 3.
- **Form flags, rehab-grade:** pelvis rotation on bird-dog, low-back arch at bridge lockout, knee valgus on wall squat, chin-poke on rows. Flags speak the app's language: regress, don't stop.
- **Guided retest mode.** The 13-test assessment performed *to* the camera with timed holds and side-by-side symmetry readouts; results pre-fill the assessment (user confirms every value — the camera proposes, the human disposes).
- **Exit criteria:** pose pipeline validated against manually counted gold-standard sets (≥95% rep accuracy on library exercises); all processing on-device, provably.

## v4.0 — THE CLINIC EDITION *(target: Jun 2027)*

**Theme: from personal tool to institutional instrument.**

- **Clinician share & review.** One-tap, expiring, read-only links: assessment history, findings, pain trend, adherence, gate status — the exact sheet a physio wants, generated from real data. Clinician can annotate; annotations return as plan notes (never silent plan edits).
- **Program templates.** Clinician-grade template library (post-op-adjacent conservative, desk-worker, athletic return) built on the same findings schema — a template is a starting assessment profile, not a generic workout list.
- **Multi-profile on one device** (family mode), each profile fully isolated.
- **Audit & governance.** Every plan generation is reproducible: inputs (assessment version, rules version) stamped on each plan; a public CHANGELOG and a rules registry. This is what "institutional" means: another professional can inspect *why* the app prescribed anything.
- **Accessibility pass to WCAG 2.2 AA**: full screen-reader flows for the player, voice control of timers, high-contrast and large-text modes, reduced-motion honored everywhere.
- **Exit criteria:** one external physiotherapist reviews a real share link and the rules registry, end to end; findings documented in the repo.

## v4.5 — PEOPLE LIKE US *(target: Aug 2027)*

**Theme: accountability without the noise of social media.**

- **Opt-in circles.** 2–6 people, streaks and session checkmarks only — no feeds, no comments, no leaderboards of pain. A circle sees "trained today", nothing clinical.
- **Partner mode.** Paired streaks (Nayab clause: a shared chain two people protect together) and synchronized Live sessions.
- **Challenges with guardrails.** Consistency challenges only (days trained), never load or volume — the app refuses to gamify intensity on a rehab population.
- **Exit criteria:** social features are off by default, removable in one tap, and share zero health data by design.

## v5.0 — THE PLATFORM *(target: Nov 2027)*

**Theme: BackForge as infrastructure for back health.**

- **Multi-device sync, end-to-end encrypted**, conflict-free (CRDT-class), still local-first: phone starts a session, tablet finishes it, nothing waits on a server.
- **Open plan schema + API.** The findings schema, exercise library format and gate rules published as a documented, versioned spec — other apps and researchers can build on it; export is total and lossless, forever.
- **Research mode (opt-in, consent-first).** Anonymized, aggregated outcome datasets for the questions rehab science actually needs: which findings predict response to which blocks? BackForge's own rules get *tested by its data* and revised in public.
- **Validation study.** Partner with a clinic or university for a prospective observational run: adherence rate, pain trajectory, Oswestry/Roland-Morris change at 12 weeks vs published norms. Publish whatever it shows.
- **Internationalization** (es, hi, ur at launch) with clinician-reviewed translations of safety copy first, UI strings second.
- **Platform quality bar:** performance budget (first interaction < 1s on a mid-range phone, offline, installed), crash-free sessions ≥ 99.9%, every release gated on the safety-invariant test suite + a full assessment-to-plan golden-path regression.

---

## Cross-cutting tracks (continuous, all versions)

- **Clinical evidence watch.** Quarterly review of the library and tests against new literature (McGill/BackFitPro updates, E3 Rehab, Squat University, Low Back Ability, Christina Nicci frameworks); every change lands as a rules-version bump with rationale in the CHANGELOG.
- **Safety governance.** A standing red-flag review: stop rules, urgent-care triggers and scope language re-read every release. The app screens and trains; it never diagnoses — that sentence is load-bearing.
- **Privacy posture.** No analytics SDKs, no ads, no trackers — at any version, at any price pressure. If v5's research mode exists, it is opt-in, revocable, and boringly documented.
- **Engineering discipline.** Single-file until v3.0's schema work; automated tests for the plan generator from v2.0 onward; README + CHANGELOG updated in the same push as any change (standing repo rule); every release verified live after deploy, never assumed.

## Milestone summary

| Version | Theme | Headline proof |
|---|---|---|
| v1.0 | Clinical core | Assessment → findings → plan, pain-gated progression |
| **v2.0** | **Live Mode** | **Three taps to a coached workout; defaults that learn** |
| **v2.5** | **Coach's memory** | **Readiness score, per-exercise response learning, streak repair** |
| v3.0 | Connected body | Health Connect sync, recovery-aware gates |
| v3.5 | Eyes on form | On-device form flags, camera-guided retest |
| v4.0 | Clinic edition | Clinician share, templates, audit registry, WCAG AA |
| v4.5 | Circles | Guardrailed social accountability |
| v5.0 | Platform | E2E sync, open schema/API, validation study, i18n |

*The through-line: v1 made the plan right. v2 makes starting effortless. v3–v5 make it connected, observable, shareable and provable — without ever trading away safety, privacy, or the micro-counts rule.*
