/* BackForge v3.0 functional harness.
   Loads the real index.html in jsdom, seeds localStorage before parse,
   and exercises the production functions. Run:
     node dev/harness-v3.mjs
   (needs jsdom resolvable from /tmp/bf-harness — a scratch install
   outside the repo; the app itself has no dependencies.) */
import { createRequire } from 'module';
import fs from 'fs';
const { JSDOM } = createRequire('/tmp/bf-harness/package.json')('jsdom');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('ok   - ' + name); }
  else { fail++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const today = fmt(new Date());

function loadApp(seedRaw) {
  const dom = new JSDOM(html, {
    url: 'https://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(window) {
      window.URL.createObjectURL = () => 'blob:mock';
      window.URL.revokeObjectURL = () => {};
      window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (t, p) => (typeof p === 'string' ? (() => {}) : undefined), set: () => true
      });
      window.confirm = () => true;
      if (seedRaw != null) window.localStorage.setItem('backforge_v1', seedRaw);
    }
  });
  return dom.window;
}
const E = (w, expr) => w.eval(expr);
const setS = (w, obj) => E(w, 'S = ' + JSON.stringify(obj));

function baseState(over) {
  return Object.assign({
    v: 1, schema: 2, answers: {}, results: null, assessHistory: [], log: [], checkins: [],
    bandLevel: {}, swaps: {}, player: null, reminder: null, livePrefs: null, exLog: [],
    livePlayer: null, protein: {}, bodyweightKg: null, deloadUntil: null,
    health: { days: {}, meta: null, paused: false, lastSyncAt: null },
    waist: [], backup: { destination: '', lastExportAt: null }, migratedFrom: null
  }, over || {});
}
function ckRange(n0, n1, painFn) {
  const out = [];
  for (let i = n0; i <= n1; i++) out.push({ date: daysAgo(i), pain: painFn(i), where: 'back', sleep: 'ok' });
  return out;
}
function sess(n, kind) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ date: daysAgo(i % 13), kind: kind || 'full', title: 'S', pain: 2 });
  return out;
}

/* ---------- 1. Migration: v2.5 state -> schema 2, lossless ---------- */
{
  const v25 = {
    v: 1, answers: { dirbend: 'better', dirext: 'worse' },
    results: [{ sev: 'high', t: 'Extension-intolerant pattern', d: 'd', fix: 'f' }],
    assessHistory: [{ date: daysAgo(20), flags: ['Extension-intolerant pattern'] }],
    log: [{ date: daysAgo(1), kind: 'full', title: 'Strength A', pain: 2 }],
    checkins: [{ date: daysAgo(1), pain: 3, where: 'back', sleep: 'ok' }],
    bandLevel: { row: 2 }, swaps: {}, player: null, reminder: { on: true, time: '19:00' },
    livePrefs: null, exLog: [{ date: daysAgo(1), id: 'curlup' }], livePlayer: null,
    protein: { [daysAgo(1)]: 120 }, bodyweightKg: 83.5, deloadUntil: null
  };
  const raw = JSON.stringify(v25);
  const w = loadApp(raw);
  check('migration: schema becomes 3', E(w, 'S.schema') === 3);
  check('migration: migratedFrom recorded as 1', E(w, 'S.migratedFrom') === 1);
  check('migration: answers preserved', E(w, 'S.answers.dirext') === 'worse');
  check('migration: results preserved', E(w, 'S.results.length') === 1 && E(w, 'S.results[0].t') === 'Extension-intolerant pattern');
  check('migration: log/checkins/exLog preserved', E(w, 'S.log.length') === 1 && E(w, 'S.checkins.length') === 1 && E(w, 'S.exLog.length') === 1);
  check('migration: protein + bodyweight preserved', E(w, 'S.protein[Object.keys(S.protein)[0]]') === 120 && E(w, 'S.bodyweightKg') === 83.5);
  check('migration: bandLevel + reminder preserved', E(w, 'S.bandLevel.row') === 2 && E(w, 'S.reminder.time') === '19:00');
  check('migration: health/waist/backup defaults added', E(w, '!!S.health && !!S.health.days && Array.isArray(S.waist) && !!S.backup'));
  check('migration: pristine premigration copy kept', w.localStorage.getItem('backforge_v1_premigration') === raw);
  const migratedRaw = w.localStorage.getItem('backforge_v1');
  const w2 = loadApp(migratedRaw);
  check('migration: idempotent on second load', E(w2, 'S.schema') === 3 && E(w2, 'S.migratedFrom') === 1 && w2.localStorage.getItem('backforge_v1_premigration') === null);
}
{
  const w = loadApp(null);
  check('fresh install: schema 3, no migration mark', E(w, 'S.schema') === 3 && E(w, 'S.migratedFrom') === null);
}

/* ---------- 2. Progression gate (pain + consistency + recovery) ---------- */
{
  const w = loadApp(null);
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9) }));
  check('gate: pain+sessions pass, no health data -> READY', E(w, 'gateStatus()') === 'READY — level up', E(w, 'gateStatus()'));
  setS(w, baseState({ checkins: ckRange(0, 13, () => 5), log: sess(9) }));
  check('gate: avg pain 5 -> Hold pain or consistency', E(w, 'gateStatus()') === 'Hold — pain or consistency');
  setS(w, baseState({ checkins: ckRange(0, 3, () => 2), log: sess(9) }));
  check('gate: <5 checkins -> Warming up', E(w, 'gateStatus()') === 'Warming up');
  const lowSteps = {}; for (let i = 0; i < 10; i++) lowSteps[daysAgo(i)] = { steps: 2500, zone2Min: 30, sleepMin: 420, sleepDeepMin: 60, sleepScore: null, weightKg: null };
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9), health: { days: lowSteps, meta: {}, paused: false, lastSyncAt: today } }));
  check('gate: sedentary fortnight (2500 steps x10d) -> Hold recovery', E(w, 'gateStatus()') === 'Hold — recovery', E(w, 'gateDetail().lines.join(" ")'));
  const okSteps = {}; for (let i = 0; i < 10; i++) okSteps[daysAgo(i)] = { steps: 6500, zone2Min: 30, sleepMin: 420, sleepDeepMin: 60, sleepScore: null, weightKg: null };
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9), health: { days: okSteps, meta: {}, paused: false, lastSyncAt: today } }));
  check('gate: healthy steps + zone2 -> READY', E(w, 'gateStatus()') === 'READY — level up');
  const noZone = {}; for (let i = 0; i < 10; i++) noZone[daysAgo(i)] = { steps: 6500, zone2Min: 0, sleepMin: 420, sleepDeepMin: 60, sleepScore: null, weightKg: null };
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9), health: { days: noZone, meta: {}, paused: false, lastSyncAt: today } }));
  check('gate: zero zone2 over 10 covered days -> Hold recovery', E(w, 'gateStatus()') === 'Hold — recovery');
  const sparse = {}; for (let i = 0; i < 4; i++) sparse[daysAgo(i)] = { steps: 1000, zone2Min: 0, sleepMin: 420, sleepDeepMin: 60, sleepScore: null, weightKg: null };
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9), health: { days: sparse, meta: {}, paused: false, lastSyncAt: today } }));
  check('gate: thin coverage (4d) cannot hold -> READY', E(w, 'gateStatus()') === 'READY — level up');
  setS(w, baseState({ checkins: ckRange(0, 13, () => 2), log: sess(9), health: { days: lowSteps, meta: {}, paused: true, lastSyncAt: today } }));
  check('gate: paused sync is ignored -> READY', E(w, 'gateStatus()') === 'READY — level up');
}

/* ---------- 3. Readiness: v2.5 behaviour + synced drivers ---------- */
{
  const w = loadApp(null);
  setS(w, baseState({ checkins: [{ date: daysAgo(1), pain: 4, where: 'back', sleep: 'ok' }, { date: today, pain: 2, where: 'back', sleep: 'great' }] }));
  const r = E(w, 'computeReadiness()');
  check('readiness: strong day -> full at 98', r.level === 'full' && r.score === 98, JSON.stringify(r));
  setS(w, baseState({ checkins: [{ date: today, pain: 8, where: 'back', sleep: 'ok' }] }));
  check('readiness: pain 8 -> relief override', E(w, 'computeReadiness().level') === 'relief');
  setS(w, baseState({ checkins: [{ date: daysAgo(3), pain: 2, where: 'back', sleep: 'ok' }] }));
  check('readiness: stale check-in is confessed', /day\(s\) ago/.test(E(w, 'computeReadiness().why')));
  const base = baseState({ checkins: [{ date: today, pain: 2, where: 'back', sleep: 'ok' }] });
  setS(w, base); const s0 = E(w, 'computeReadiness().score');
  const withSleep = baseState({ checkins: base.checkins, health: { days: { [today]: { steps: 5000, zone2Min: 0, sleepMin: 300, sleepDeepMin: 40, sleepScore: null, weightKg: null } }, meta: {}, paused: false, lastSyncAt: today } });
  setS(w, withSleep); const s1 = E(w, 'computeReadiness().score');
  check('readiness: 5h synced sleep costs 10', s0 - s1 === 10, s0 + ' -> ' + s1);
  const withSteps = baseState({ checkins: base.checkins, health: { days: { [daysAgo(1)]: { steps: 12000, zone2Min: 0, sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: null } }, meta: {}, paused: false, lastSyncAt: today } });
  setS(w, withSteps); const s2 = E(w, 'computeReadiness().score');
  check('readiness: 12000 steps yesterday costs 5', s0 - s2 === 5, s0 + ' -> ' + s2);
  const paused = baseState({ checkins: base.checkins, health: { days: withSleep.health.days, meta: {}, paused: true, lastSyncAt: today } });
  setS(w, paused);
  check('readiness: paused sync adds no drivers', E(w, 'computeReadiness().score') === s0);
  const fragment = baseState({ checkins: base.checkins, health: { days: { [today]: { steps: 4000, zone2Min: 0, sleepMin: 80, sleepDeepMin: 10, sleepScore: null, weightKg: null } }, meta: {}, paused: false, lastSyncAt: today } });
  setS(w, fragment);
  check('readiness: 80-min fragment night is ignored, not judged', E(w, 'computeReadiness().score') === s0);
}

/* ---------- 4. Sync import / pause / delete ---------- */
{
  const w = loadApp(null);
  const payload = { kind: 'backforge-health-sync', version: 1, generatedAt: '2026-11-17T10:00:00', source: 'Health Connect via Muse (health-cli)', window: { from: daysAgo(2), to: today }, zone2: { hrMin: 110, hrMax: 129 }, coverage: { complete: false, note: '' }, days: [
    { date: daysAgo(1), steps: 14304, zone2Min: 0, sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: null },
    { date: today, steps: null, zone2Min: 25, sleepMin: 527, sleepDeepMin: 149, sleepScore: null, weightKg: 83.5 }
  ] };
  check('sync: valid payload imports', E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(payload)) + ')') === true);
  check('sync: days merged with fields intact', E(w, 'S.health.days[' + JSON.stringify(today) + '].sleepMin') === 527 && E(w, 'S.health.days[' + JSON.stringify(daysAgo(1)) + '].steps') === 14304);
  check('sync: meta + lastSyncAt recorded', E(w, '!!S.health.meta && S.health.lastSyncAt') === today);
  check('sync: wrong-kind file refused, state untouched', E(w, 'importHealthSync("{\\"kind\\":\\"nope\\",\\"version\\":1,\\"days\\":[]}")') === false && E(w, 'Object.keys(S.health.days).length') === 2);
  E(w, 'toggleSyncPause()');
  check('sync: pause makes healthDay invisible', E(w, 'healthDay(' + JSON.stringify(today) + ')') === null);
  E(w, 'toggleSyncPause()');
  E(w, 'deleteHealthSync()');
  check('sync: delete clears days and meta', E(w, 'Object.keys(S.health.days).length') === 0 && E(w, 'S.health.meta') === null);
}

/* ---------- 5. Trends: honest correlation language ---------- */
{
  const w = loadApp(null);
  check('pearson: perfect positive = 1', Math.abs(E(w, 'pearson([1,2,3,4],[2,4,6,8])') - 1) < 1e-9);
  setS(w, baseState({}));
  check('trends: no data -> not-enough-data language', /Not enough overlapping data/.test(E(w, 'trendAnalysis().weightVerdict')));
  const days = {}, cks = [];
  [28, 21, 14, 7, 0].forEach((n, i) => { days[daysAgo(n)] = { steps: 6000, zone2Min: 10, sleepMin: 420, sleepDeepMin: 60, sleepScore: null, weightKg: 90 - i * 2 }; cks.push({ date: daysAgo(n), pain: 6 - i, where: 'back', sleep: 'ok' }); });
  setS(w, baseState({ checkins: cks, health: { days, meta: {}, paused: false, lastSyncAt: today } }));
  const v = E(w, 'trendAnalysis().weightVerdict');
  check('trends: 5 paired weeks -> correlation with causation caveat', /paired weeks/.test(v) && /Correlation is not causation/.test(v), v);
}

/* ---------- 6. Desk-day defense ---------- */
{
  const w = loadApp(null);
  const block = E(w, 'buildDeskBlock()');
  const ids = block.sections[0].items.map(i => i.id);
  check('desk: block is the five standing moves', JSON.stringify(ids) === JSON.stringify(['chintuck', 'wallangel', 'hipflexorstretch', 'pullapart', 'march9090']), ids.join(','));
  check('desk: every move exists in the library', E(w, JSON.stringify(ids) + '.every(id=>!!EXBY[id])'));
  const y = daysAgo(1), yDow = new Date(y + 'T12:00:00').getDay(), yWeekday = yDow >= 1 && yDow <= 5;
  setS(w, baseState({ health: { days: { [today]: { steps: null, zone2Min: 0, sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: null }, [y]: { steps: 2000, zone2Min: 0, sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: null } }, meta: {}, paused: false, lastSyncAt: today } }));
  const info = E(w, 'deskDayInfo()');
  check('desk: low-step day detected, flag matches weekday rule', info && info.date === y && info.desk === yWeekday, JSON.stringify(info));
  setS(w, baseState({ checkins: [{ date: today, pain: 8, where: 'back', sleep: 'ok' }] }));
  check('desk: flare day swaps the block for relief', /relief/i.test(E(w, 'buildDeskBlock().title')));
}

/* ---------- 7. Backup ritual ---------- */
{
  const w = loadApp(null);
  check('backup: no destination -> export refused', E(w, 'exportBackup()') === false && E(w, 'S.backup.lastExportAt') === null);
  E(w, 'S.backup.destination = "Drive / BackForge folder"');
  check('backup: named destination -> export runs and stamps the date', E(w, 'exportBackup()') === true && E(w, 'S.backup.lastExportAt') === today);
}

/* ---------- 8. v2.5 regressions ---------- */
{
  const w = loadApp(null);
  const answers = {}; ['dirbend', 'dirext', 'firing_L', 'firing_R', 'slbridge_L', 'slbridge_R', 'clamfeel_L', 'clamfeel_R', 'thomas_L', 'thomas_R', 'pelvis', 'slr', 'hipir_L', 'hipir_R', 'switch9090', 'posturewall', 'guard'].forEach(k => answers[k] = 'skip');
  setS(w, baseState({ answers }));
  check('regression: skip = no data (zero findings)', E(w, 'scoreAssessment().length') === 0);
  setS(w, baseState({ bodyweightKg: 80 }));
  check('regression: protein target 1.6 g/kg at 80 kg = 128', E(w, 'proteinTarget()') === 128);
  const exState = baseState({
    exLog: [{ date: daysAgo(3), id: 'glutebridge' }, { date: daysAgo(2), id: 'glutebridge' }],
    checkins: [{ date: daysAgo(3), pain: 5, where: 'back', sleep: 'ok' }, { date: daysAgo(2), pain: 3, where: 'back', sleep: 'ok' }, { date: daysAgo(1), pain: 2, where: 'back', sleep: 'ok' }]
  });
  setS(w, exState);
  check('regression: response learning still finds Helps', E(w, 'exerciseResponse().glutebridge.verdict') === 'helps', JSON.stringify(E(w, 'exerciseResponse().glutebridge')));
  const repState = baseState({ log: [{ date: daysAgo(3), kind: 'full', title: 'A', pain: 2 }, { date: daysAgo(2), kind: 'full', title: 'B', pain: 2 }] });
  setS(w, repState);
  check('regression: one missed day offers repair', E(w, 'repairOffer()') !== null);
  setS(w, baseState({ log: [{ date: daysAgo(4), kind: 'full', title: 'A', pain: 2 }] }));
  check('regression: two missed days -> no repair offer', E(w, 'repairOffer()') === null);
  setS(w, baseState({ checkins: ckRange(0, 20, i => i <= 6 ? 4 : i <= 13 ? 3 : 2) }));
  check('regression: two rising weeks propose a deload', E(w, 'deloadStatus().state') === 'propose', E(w, 'deloadStatus().why'));
  setS(w, baseState({ checkins: [{ date: today, pain: 8, where: 'back', sleep: 'ok' }] }));
  const flare = E(w, 'buildLiveWorkout(20,"flare",[])');
  check('regression: flare build is relief-only', /flare protocol/.test(flare.title) && flare.sections.length === 1);
  setS(w, baseState({}));
  const normal = E(w, 'buildLiveWorkout(20,"ok",[])');
  const allIds = normal.sections.flatMap(s => s.items.map(i => i.id));
  check('regression: normal build has warm/main/cool, all real exercises', normal.sections.length === 3 && allIds.length >= 3 && E(w, JSON.stringify(allIds) + '.every(id=>!!EXBY[id])'));
  setS(w, baseState({ log: sess(3), checkins: ckRange(0, 6, () => 3) }));
  check('regression: weekly review composes', E(w, 'weeklyReview().sessions') === 3);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
