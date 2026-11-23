/* Generates data/demo/demo-state.json — a believable 120-day BackForge history
   (check-ins, sessions, exercise log, assessment, band levels) plus Health
   Connect days as Google Fit / Samsung Health would deliver them through Muse.
   Deterministic (seeded). Dates are anchored to ANCHOR; the app shifts every
   date so the demo always ends "today". Run: node tools/make_demo_data.mjs */
import fs from 'fs';
const ANCHOR = '2026-11-23', DAYS = 120;
let seed = 20261123; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pad = n => String(n).padStart(2, '0');
const day = n => { const d = new Date(2026, 10, 23); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const r1 = x => Math.round(x * 10) / 10;

const S = {
  v: 1, schema: 3, demo: true,
  answers: {}, results: [
    { sev: 'high', t: 'Extension-intolerant pattern', d: 'Arching back eases nothing and standing tall aggravates.', fix: 'Prone lying and press-ups removed; ribs-down cues everywhere.' },
    { sev: 'high', t: 'Right glute inhibition', d: 'Two of three glute tests compensate on the right.', fix: 'Daily activation; right side gets the extra set.' },
    { sev: 'high', t: 'Anterior pelvic tilt (lower-crossed)', d: 'Thomas test lifted; pelvis sits in tilt.', fix: 'Tilt-correction block daily.' },
    { sev: 'high', t: 'Right hip internal rotation deficit', d: 'Right IR clearly smaller than left.', fix: 'Daily IR block, right first.' },
    { sev: 'mod', t: 'Lateral endurance gap', d: 'Side plank 25 s vs 18 s.', fix: 'Extra set on the weaker side.' },
    { sev: 'mod', t: 'Forward-head / rounded shoulders', d: 'Wall test: head off the wall.', fix: 'Chin tucks daily; rows + face pulls.' },
    { sev: 'ok', t: 'Hamstrings: length is fine', d: 'Active and passive SLR match.', fix: 'No hamstring stretching added.' },
  ],
  assessHistory: [
    { date: day(118), flags: ['Extension-intolerant pattern', 'Right glute inhibition', 'Anterior pelvic tilt (lower-crossed)', 'Right hip internal rotation deficit', 'Lateral endurance gap', 'Forward-head / rounded shoulders', 'Weight-shift guarding (left)'] },
    { date: day(62), flags: ['Extension-intolerant pattern', 'Right glute inhibition', 'Anterior pelvic tilt (lower-crossed)', 'Right hip internal rotation deficit', 'Lateral endurance gap', 'Forward-head / rounded shoulders'] },
    { date: day(9), flags: ['Extension-intolerant pattern', 'Right glute inhibition', 'Anterior pelvic tilt (lower-crossed)', 'Right hip internal rotation deficit', 'Lateral endurance gap'] },
  ],
  log: [], checkins: [], exLog: [],
  bandLevel: { pullapart: 3, facepull: 3, row: 3, clamshell: 2, glutebridge: 3, sidesteps: 2, pallof: 2, deadbug: 2, pullthrough: 2 },
  swaps: {}, player: null, reminder: { on: true, time: '07:15', lastFired: null }, livePrefs: { mins: 20, energy: 'ok', caveats: [] }, livePlayer: null,
  protein: {}, bodyweightKg: 86.4, deloadUntil: null,
  health: { days: {}, meta: { source: 'Health Connect (Google Fit · Samsung Health · Galaxy Watch 7)', zone2Band: [111, 130], method: '60–70% of 220 − age', generatedBy: 'tools/make_demo_data.mjs' }, paused: false, lastSyncAt: day(0) + 'T07:02:00' },
  waist: [], backup: { destination: 'Google Drive / BackForge backups', lastExportAt: day(5) },
  profile: { name: 'Ayaan', heightCm: 178, birthYear: 1996 },
};
const POOL = ['catcamel', 'breathing360', 'glutebridge', 'clamshell', 'birddog', 'curlup', 'sideplank', 'pallof', 'deadbug', 'row', 'facepull', 'pullapart', 'hipir9090', 'proneir', 'hipflexorstretch', 'figure4', 'chintuck', 'wallangel', 'singlebridge', 'sidesteps', 'hiphinge', 'wallsquat'];
const WORK = ['Elliptical', 'Treadmill walk', 'Outdoor walk', 'Cycling'];

let pain = 6.2, weight = 92.4, prevIds = [];
const HELPS = ['birddog', 'glutebridge', 'hipflexorstretch', 'deadbug'], WATCH = ['wallsquat'];
for (let n = DAYS - 1; n >= 0; n--) {
  const t = 1 - n / (DAYS - 1);            // 0 → 1 over the period
  const d = day(n);
  const dow = new Date(2026, 10, 23 - n).getDay();
  const flare = n <= 68 && n >= 63;         // one flare week, day 52-57 of the journey
  // pain: trends 6 → 2, flare bump, daily noise
  const target = lerp(6.2, 2.9, Math.pow(t, 0.8)) + (flare ? 3.4 - (n - 63) * 0.3 : 0);
  const resp = prevIds.filter(i => HELPS.includes(i)).length * -1.1 + (prevIds.includes('wallsquat') ? 2.2 : 0);
  pain = clamp(pain * 0.55 + target * 0.45 + gauss() * 0.45 + resp, 0, 10);
  prevIds = [];
  const sleepMin = Math.round(clamp(lerp(375, 438, t) + gauss() * 38 - (flare ? 40 : 0) + (dow === 6 || dow === 0 ? 25 : 0), 250, 560));
  const sleepQ = sleepMin < 360 ? 'poor' : sleepMin > 450 ? 'great' : 'ok';
  const checkedIn = rnd() < lerp(0.72, 0.95, t);
  if (checkedIn) S.checkins.push({ date: d, pain: Math.round(pain), where: pain >= 5 && rnd() < 0.3 ? 'leg-r' : 'back', sleep: sleepQ });
  const trains = flare ? rnd() < 0.8 : rnd() < lerp(0.6, 0.9, t);
  let sessionMin = 0;
  if (trains) {
    const kind = flare ? 'flare' : rnd() < 0.7 ? 'live' : rnd() < 0.5 ? 'full' : 'micro';
    const mins = kind === 'flare' ? 8 : kind === 'micro' ? 5 : [10, 20, 20, 35, 35, 50][Math.floor(rnd() * 6)];
    sessionMin = mins;
    S.log.push({ date: d, kind, title: kind === 'flare' ? 'Relief session' : kind === 'micro' ? 'Micro session' : `Live workout · ${mins} min`, pain: checkedIn ? Math.round(pain) : null, mins });
    const k = kind === 'flare' ? 3 : Math.round(mins / 4);
    const picked = new Set(); while (picked.size < Math.min(k, POOL.length)) picked.add(POOL[Math.floor(rnd() * POOL.length)]);
    picked.forEach(id => S.exLog.push({ date: d, id })); prevIds = [...picked];
  }
  // Health Connect day
  weight = weight + (lerp(92.4, 86.3, t) - weight) * 0.12 + gauss() * 0.12;
  const steps = Math.round(clamp(lerp(5200, 8600, t) + gauss() * 1900 + (dow === 6 ? 2500 : 0) - (flare ? 2500 : 0), 900, 19000));
  const deep = Math.round(sleepMin * clamp(0.16 + gauss() * 0.03, 0.08, 0.25));
  const rem = Math.round(sleepMin * clamp(0.21 + gauss() * 0.03, 0.12, 0.3));
  const awake = Math.round(clamp(18 + gauss() * 9 + (flare ? 15 : 0), 3, 70));
  const cardio = !flare && (dow === 2 || dow === 4 || dow === 6) && rnd() < lerp(0.55, 0.9, t);
  const z2 = cardio ? Math.round(clamp(26 + gauss() * 5, 12, 45)) : 0;
  const workouts = [];
  if (cardio) workouts.push({ type: WORK[Math.floor(rnd() * WORK.length)], min: z2 + Math.round(rnd() * 6), avgHr: Math.round(120 + gauss() * 4) });
  if (sessionMin) workouts.push({ type: 'BackForge session', min: sessionMin, avgHr: Math.round(98 + gauss() * 6) });
  const activeKcal = Math.round(steps * 0.04 + z2 * 8 + sessionMin * 4);
  const bmr = Math.round(10 * weight + 6.25 * 178 - 5 * 30 + 5);
  const out = bmr + activeKcal;
  const logged = rnd() < lerp(0.3, 0.75, t);
  S.health.days[d] = {
    steps, distanceKm: r1(steps * 0.00074), activeKcal, caloriesOut: out,
    caloriesIn: logged ? Math.round(out - lerp(350, 450, t) + gauss() * 220) : null,
    zone2Min: z2, sleepMin, sleepDeepMin: deep, sleepRemMin: rem, sleepAwakeMin: awake, sleepLightMin: sleepMin - deep - rem,
    sleepScore: Math.round(clamp(50 + (sleepMin - 360) / 4 + deep / 6 - awake / 3 + gauss() * 4, 35, 98)),
    bedtime: `${pad(23 + (rnd() < 0.4 ? 0 : 0))}:${pad(Math.floor(rnd() * 60))}`,
    restingHr: Math.round(lerp(68, 59.5, t) + gauss() * 1.6 + (flare ? 3 : 0) + (sleepMin < 340 ? 2 : 0)),
    hrvMs: Math.round(clamp(lerp(36, 53, t) + gauss() * 5 - (flare ? 7 : 0) - (sleepMin < 340 ? 5 : 0), 18, 90)),
    spo2: r1(clamp(96.6 + gauss() * 0.7, 93, 99.5)),
    weightKg: n % 3 === 0 || rnd() < 0.3 ? r1(weight) : null,
    bodyFatPct: n % 7 === 0 ? r1(lerp(26.5, 22.8, t) + gauss() * 0.3) : null,
    vo2max: n % 7 === 0 ? r1(lerp(37.5, 41.4, t) + gauss() * 0.3) : null,
    workouts,
  };
  if (n % 7 === 0) S.waist.push({ date: d, cm: r1(lerp(98, 92.5, t) + gauss() * 0.4) });
  if (logged) S.protein[d] = Math.round(lerp(95, 132, t) + gauss() * 18);
}
// ---- posture history: three posture checks (improving) + two Muse photo reviews ----
const chk = (n, grades, summary) => ({ date: day(n), bandLevel: 'light', grades, inputs: {}, painFlag: false, carried: {}, carriedPain: {}, v: 2, summary });
S.posture = {
  cues: {}, captures: [], formLog: [],
  bandChecks: [
    chk(110, { 'tilt-control': 'Moderate', 'deadbug-band': 'Moderate', 'hip-ir-band': 'Priority', 'pallof-hold': 'Mild', 'glutemed-wall': 'Moderate', 'chintuck-band': 'Moderate', 'pullapart-endurance': 'Moderate', 'wallslide-band': 'Moderate', 'occiput-wall': 'Moderate', 'dnf-endurance': 'Priority', 'pec-minor': 'Moderate', 'overhead-reach': 'Moderate', 'thoracic-rotation': 'Mild' }, { apt: 'Moderate', head: 'Priority', back: 'Moderate', shoulders: 'Moderate', upper: 'Moderate', overall: 'Moderate' }),
    chk(58, { 'tilt-control': 'Mild', 'deadbug-band': 'Moderate', 'hip-ir-band': 'Moderate', 'pallof-hold': 'Mild', 'glutemed-wall': 'Mild', 'chintuck-band': 'Moderate', 'pullapart-endurance': 'Mild', 'wallslide-band': 'Moderate', 'occiput-wall': 'Moderate', 'dnf-endurance': 'Moderate', 'pec-minor': 'Mild', 'overhead-reach': 'Mild', 'thoracic-rotation': 'Mild' }, { apt: 'Mild', head: 'Moderate', back: 'Moderate', shoulders: 'Mild', upper: 'Moderate', overall: 'Moderate' }),
    chk(9, { 'tilt-control': 'Mild', 'deadbug-band': 'Mild', 'hip-ir-band': 'Moderate', 'pallof-hold': 'Clear', 'glutemed-wall': 'Mild', 'chintuck-band': 'Mild', 'pullapart-endurance': 'Clear', 'wallslide-band': 'Mild', 'occiput-wall': 'Moderate', 'dnf-endurance': 'Mild', 'pec-minor': 'Mild', 'overhead-reach': 'Mild', 'thoracic-rotation': 'Clear' }, { apt: 'Mild', head: 'Mild', back: 'Moderate', shoulders: 'Mild', upper: 'Mild', overall: 'Mild' }),
  ],
  findings: [
    { sev: 'mod', t: 'Right hip internal rotation deficit — band check', d: 'Banded IR test graded Moderate.', fix: 'Daily IR work stays the corrective priority, deficit side first.' },
    { sev: 'mod', t: 'Hunched upper back (thoracic kyphosis) — posture check', d: 'Upper-back tests graded moderate.', fix: 'Daily thoracic mobility (open book, wall slides) before rows and face pulls.' },
  ],
  assessments: [
    { date: day(108), version: 2, requestId: 'pos_demo_1', summary: 'Clear forward head carriage and a rounded upper back on both side views; pelvis tips forward with a deep low-back curve.', notes: '', suggestedFocus: ['Deep neck flexors', 'Thoracic extension', 'Glute max'],
      patterns: { pelvicTilt: { grade: 'moderate', confidence: 0.7, viewsUsed: ['side-right', 'side-left'], observations: ['Waistband slopes down at the front (side-right)'], consistency: 'agrees', progress: null }, forwardHead: { grade: 'marked', confidence: 0.8, viewsUsed: ['side-right'], observations: ['Ear well ahead of the shoulder line (side-right)'], consistency: 'agrees', progress: null }, thoracicKyphosis: { grade: 'moderate', confidence: 0.65, viewsUsed: ['side-left'], observations: ['Rounded upper back (side-left)'], consistency: 'agrees', progress: null }, shoulderRound: { grade: 'moderate', confidence: 0.7, viewsUsed: ['front', 'side-right'], observations: ['Palms face backward (front)'], consistency: 'agrees', progress: null }, shoulderAsymmetry: { grade: 'mild', confidence: 0.6, viewsUsed: ['front'], observations: ['Right shoulder slightly lower'], consistency: null, progress: null } } },
    { date: day(8), version: 2, requestId: 'pos_demo_2', summary: 'Head sits noticeably closer over the shoulders than in the earlier set; upper back still rounded; pelvis closer to neutral.', notes: '', suggestedFocus: ['Thoracic extension', 'Mid-back rows'],
      patterns: { pelvicTilt: { grade: 'mild', confidence: 0.7, viewsUsed: ['side-right', 'side-left'], observations: ['Smaller low-back curve than last set'], consistency: 'agrees', consistencyWhy: 'Mild tilt in photos, Mild in tests.', progress: 'better' }, forwardHead: { grade: 'mild', confidence: 0.75, viewsUsed: ['side-right'], observations: ['Ear closer to the shoulder line (side-right)'], consistency: 'agrees', consistencyWhy: 'Photos and neck tests both mild.', progress: 'better' }, thoracicKyphosis: { grade: 'moderate', confidence: 0.6, viewsUsed: ['side-left'], observations: ['Upper back still rounded (side-left)'], consistency: 'agrees', consistencyWhy: 'Occiput-to-wall test also moderate.', progress: 'same' }, shoulderRound: { grade: 'moderate', confidence: 0.65, viewsUsed: ['front'], observations: ['Some inward rotation remains (front)'], consistency: 'photo-shows-more', consistencyWhy: 'Photos look a step worse than the Mild test grade — worth retesting pull-aparts.', progress: 'better' } } },
  ],
};
for (let n = 40; n >= 1; n -= 3) for (const id of ['openbook', 'chintuck', 'deepneckflexor', 'pullapart', 'row']) S.posture.formLog.push({ date: day(n), id, r: id === 'deepneckflexor' && n > 25 ? 'hard' : n < 12 || id !== 'row' ? 'clean' : 'shaky' });
S.profile.displayName = 'Ayaan';
fs.writeFileSync(new URL('../data/demo/demo-state.json', import.meta.url), JSON.stringify({ _about: 'Demo data only — loaded by the app in Demo mode into its own storage key; never mixed with real data. Regenerate: node tools/make_demo_data.mjs', anchor: ANCHOR, state: S }) + '\n');
console.log('days', Object.keys(S.health.days).length, 'checkins', S.checkins.length, 'sessions', S.log.length, 'exLog', S.exLog.length);
