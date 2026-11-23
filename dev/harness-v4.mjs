/* BackForge v4.0 functional harness.
   Loads the real index.html in jsdom (WebCrypto injected), seeds
   localStorage before parse, exercises the v4 modules: schema-3
   migration, band grading, findings -> plan hooks, PIN, vault,
   sync v2, posture-result import, exercise DB + videos, shell.
   Run: node dev/harness-v4.mjs  (jsdom from /tmp/bf-harness) */
import { createRequire } from 'module';
import { webcrypto } from 'node:crypto';
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
      Object.defineProperty(window, 'crypto', { value: webcrypto });
      window.URL.createObjectURL = () => 'blob:mock';
      window.URL.revokeObjectURL = () => {};
      window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
        get: (t, p) => (typeof p === 'string' ? (() => {}) : undefined), set: () => true
      });
      window.confirm = () => true;
      window.scrollTo = () => {};
      if (seedRaw != null) window.localStorage.setItem('backforge_v1', seedRaw);
    }
  });
  return dom.window;
}
const E = (w, expr) => w.eval(expr);

function baseState(over) {
  return Object.assign({
    v: 1, schema: 2, answers: {}, results: null, assessHistory: [], log: [], checkins: [],
    bandLevel: {}, swaps: {}, player: null, reminder: null, livePrefs: null, exLog: [],
    livePlayer: null, protein: {}, bodyweightKg: null, deloadUntil: null,
    health: { days: {}, meta: null, paused: false, lastSyncAt: null },
    waist: [], backup: { destination: '', lastExportAt: null }, migratedFrom: null
  }, over || {});
}

/* ---------- 1. Shell + static safety ---------- */
{
  const w = loadApp(null);
  check('shell: bottom nav has exactly 5 tab buttons', E(w, "document.querySelectorAll('nav.bottom button[data-nav]').length") === 5);
  check('shell: five views + profile view exist', ['view-today', 'view-live', 'view-assess', 'view-library', 'view-progress', 'view-more'].every(id => !!w.document.getElementById(id)));
  check('shell: version label v4.0 present', html.includes('BackForge v4.0'));
  check('static: owner PIN value appears nowhere in shipped HTML', !html.includes('2488'));
  check('static: PIN disclaimer present verbatim', html.includes('it is not encryption and does not protect your data'));
  check('static: no banned extension exercises in EX', !E(w, "EX.some(e=>['pressup','sphinx','proneext'].includes(e.id))"));
  check('static: no press-up content anywhere in library', !E(w, "EX.some(e=>/press-up|pressup/i.test(e.n))"));
  check('shell: navigation to every tab does not throw', (() => { try { ['today', 'live', 'assess', 'library', 'progress', 'more'].forEach(v => E(w, "go('" + v + "')")); return true; } catch (e) { return 'threw: ' + e.message; } })() === true);
  check('shell: segmented panels switch', (() => { E(w, "segShowTabs('posture','assess')"); const a = w.document.getElementById('seg-posture-assess').hidden; E(w, "segShowTabs('posture','today')"); const b = w.document.getElementById('seg-posture-assess').hidden; return a === false && b === true; })());
}

/* ---------- 2. Schema 2 -> 3 migration ---------- */
{
  const seed = baseState({ bodyweightKg: 83.5, checkins: [{ date: today, pain: 3, where: 'back', sleep: 'ok' }], bandLevel: { row: 2 } });
  const w = loadApp(JSON.stringify(seed));
  check('migration: schema becomes 3', E(w, 'S.schema') === 3);
  check('migration: v3 data preserved', E(w, 'S.bodyweightKg') === 83.5 && E(w, 'S.checkins.length') === 1 && E(w, 'S.bandLevel.row') === 2);
  check('migration: v4 defaults added', E(w, "!!S.posture && Array.isArray(S.posture.bandChecks) && 'profile' in S && !!S.vault && Array.isArray(S.weightLog) && !!S.calPlan && S.mode.travel===false"));
  const w2 = loadApp(null);
  check('fresh install: schema 3', E(w2, 'S.schema') === 3 && E(w2, 'S.profile') === null);
}

/* ---------- 3. Exercise DB + videos ---------- */
{
  const w = loadApp(null);
  check('db: 40 exercises (26 v3 + 6 directory + 8 desk/travel)', E(w, 'EX.length') === 40, String(E(w, 'EX.length')));
  check('db: every exercise has an EXDB record', E(w, 'EX.every(e=>!!EXDB[e.id])'), E(w, 'EX.filter(e=>!EXDB[e.id]).map(e=>e.id).join(",")'));
  check('db: every record carries helps/muscles/postureFix/gotIt', E(w, 'EX.every(e=>{const d=EXDB[e.id];return d.helps&&d.muscles&&d.postureFix&&d.gotIt})'));
  check('db: at least 8 no-equipment desk/travel exercises', E(w, "EX.filter(e=>(EXDB[e.id].contexts||[]).includes('desk')||(EXDB[e.id].contexts||[]).includes('travel')).length") >= 8);
  check('db: travel-mode filter set is real', E(w, "EX.filter(e=>(EXDB[e.id].contexts||[]).includes('travel')).length") >= 10);
  const direct = E(w, "Object.values(EXDB).flatMap(d=>d.vids||[]).filter(v=>v.type==='direct')");
  check('videos: >=5 verified direct links', direct.length >= 5, String(direct.length));
  check('videos: direct links are well-formed watch/shorts URLs', direct.every(v => /^https:\/\/www\.youtube\.com\/(watch\?v=|shorts\/)[\w-]{6,}$/.test(v.url)), JSON.stringify(direct.map(v => v.url)));
  check('videos: every vids entry has 2+ references where present', E(w, "Object.values(EXDB).every(d=>!d.vids||d.vids.length>=2)"));
  check('videos: ytEmbed builds nocookie embed', E(w, "ytEmbed('https://www.youtube.com/watch?v=2_e4I-brfqs')") === 'https://www.youtube-nocookie.com/embed/2_e4I-brfqs');
  E(w, "openEx('curlup')");
  check('db: exercise sheet shows got-it marker + targets', w.document.getElementById('sheet').innerHTML.includes('got it when') && w.document.getElementById('sheet').innerHTML.includes('Hold target'));
  E(w, "libCtx='travel'; libCat='All'; renderLib()");
  check('db: library renders travel-filtered moverows', w.document.getElementById('libGrid').innerHTML.includes('moverow'));
}

/* ---------- 4. Band grading (Spec A tables) ---------- */
{
  const w = loadApp(null);
  const g = (id, inp) => E(w, 'PTESTS.find(t=>t.id===' + JSON.stringify(id) + ').grade(' + JSON.stringify(inp) + ')');
  check('grade: tilt hold 20s + flat = Clear', g('tilt-control', { hold: '3', quality: 'flat' }) === 'Clear');
  check('grade: tilt hold 0 = Priority', g('tilt-control', { hold: '0', quality: 'flat' }) === 'Priority');
  check('grade: tilt hold 5-9 = Moderate', g('tilt-control', { hold: '1', quality: 'flat' }) === 'Moderate');
  check('grade: deadbug 6-8 + heavy = Clear', g('deadbug-band', { reps: '2', quality: 'heavy' }) === 'Clear');
  check('grade: deadbug 0-2 + arches = Priority', g('deadbug-band', { reps: '0', quality: 'arches' }) === 'Priority');
  check('grade: hip IR right barely moves = Priority', g('hip-ir-band', { rR: '0', rL: '3', quality: 'still' }) === 'Priority');
  check('grade: hip IR full both + still = Clear', g('hip-ir-band', { rR: '3', rL: '3', quality: 'still' }) === 'Clear');
  check('grade: hip IR one-step asymmetry = Mild', g('hip-ir-band', { rR: '2', rL: '3', quality: 'still' }) === 'Mild');
  check('grade: pallof 20s square similar = Clear', g('pallof-hold', { hold: '3', quality: 'clean', sides: 'similar' }) === 'Clear');
  check('grade: pallof 20s square one-side-worse = Mild', g('pallof-hold', { hold: '3', quality: 'clean', sides: 'worse' }) === 'Mild');
  check('grade: pullapart 16-20 clean = Clear', g('pullapart-endurance', { reps: '3', quality: 'clean' }) === 'Clear');
  check('grade: pullapart shrug = Moderate', g('pullapart-endurance', { reps: '3', quality: 'shrug' }) === 'Moderate');
  check('grade: wallslide 10 + holds = Clear', g('wallslide-band', { reps: '3', quality: 'holds' }) === 'Clear');
  check('grade: chintuck tilts down = Priority', g('chintuck-band', { reps: '3', quality: 'tilt' }) === 'Priority');
  check('combine: single Moderate among Clears blends to Mild (spec formula)', E(w, "combineGrades(['Moderate','Clear','Clear','Clear','Clear'])") === 'Mild');
  check('combine: single Priority among 3 = Moderate (spec worked example)', E(w, "combineGrades(['Priority','Clear','Clear'])") === 'Moderate');
  check('postureGrades: spec APT worked example = Priority', E(w, "postureGrades({grades:{'tilt-control':'Priority','deadbug-band':'Moderate','pallof-hold':'Mild','hip-ir-band':'Priority','glutemed-wall':'Mild'}}).apt") === 'Priority');
  check('postureGrades: spec Upper worked example = Mild', E(w, "postureGrades({grades:{'pullapart-endurance':'Mild','wallslide-band':'Clear','chintuck-band':'Mild'}}).upper") === 'Mild');
  check('combine: two Priority = Priority', E(w, "combineGrades(['Priority','Priority','Clear'])") === 'Priority');
  check('combine: all Clear = Clear', E(w, "combineGrades(['Clear','Clear'])") === 'Clear');
  check('combine: empty = null', E(w, 'combineGrades([])') === null);
}

/* ---------- 5. Wizard end-to-end: pain gate + findings -> plan ---------- */
{
  const w = loadApp(null);
  const inputs = {
    'tilt-control': { hold: '3', quality: 'flat', pain: 'leg' },
    'deadbug-band': { reps: '2', quality: 'heavy', pain: 'none' },
    'hip-ir-band': { rR: '1', rL: '3', quality: 'still', pain: 'none' },
    'pallof-hold': { hold: '3', quality: 'clean', sides: 'similar', pain: 'none' },
    'glutemed-wall': { hold: '3', quality: 'clean', pain: 'none' },
    'pullapart-endurance': { reps: '3', quality: 'clean', pain: 'none' },
    'wallslide-band': { reps: '3', quality: 'holds', pain: 'none' },
    'chintuck-band': { reps: '3', quality: 'glide', pain: 'none' }
  };
  E(w, 'WZ = { step: 8, band: "light", inputs: ' + JSON.stringify(inputs) + ' }; renderWz(); wzNext();');
  check('wizard: check saved', E(w, 'S.posture.bandChecks.length') === 1);
  check('wizard: pain into leg forces Priority + painFlag', E(w, "S.posture.bandChecks[0].grades['tilt-control']") === 'Priority' && E(w, 'S.posture.bandChecks[0].painFlag') === true);
  check('wizard: hip IR half-range grades Moderate', E(w, "S.posture.bandChecks[0].grades['hip-ir-band']") === 'Moderate');
  check('wizard: findings include physio flag + IR hook', E(w, "S.posture.findings.some(f=>/physio flag/.test(f.t)) && S.posture.findings.some(f=>f.t.includes('internal rotation deficit'))"));
  check('wizard: findings feed flagSet (plan hook live)', E(w, "has('internal rotation deficit')") === true && E(w, "has('Anterior pelvic tilt')") === true && E(w, "has('Right hip internal')") === true);
  check('wizard: foundation plan reacts (IR block present)', E(w, "buildFoundation().some(b=>b.name==='Hip internal rotation')"));
  check('wizard: summary grades computed', !!E(w, 'S.posture.bandChecks[0].summary.overall'));
}

/* ---------- 6. Cues ---------- */
{
  const w = loadApp(null);
  check('cues: 16 cues, 8 per pattern', E(w, 'POSTURE_CUES.length') === 16 && E(w, "POSTURE_CUES.filter(c=>c.pattern==='apt').length") === 8);
  check('cues: daily set is 4 (2 tilt + 2 upper)', E(w, 'todaysCues().length') === 4 && E(w, "todaysCues().filter(c=>c.pattern==='apt').length") === 2);
  const id = E(w, 'todaysCues()[0].id');
  E(w, 'toggleCue(' + JSON.stringify(id) + ')');
  check('cues: one-tap done persists', E(w, 'cueDone(' + JSON.stringify(id) + ')') === true);
  check('cues: cooking-standing cue is Spec A verbatim (sit before it builds)', E(w, "POSTURE_CUES.find(c=>c.id==='apt-cooking-standing').feel.includes('deep right-side ache') && POSTURE_CUES.find(c=>c.id==='apt-cooking-standing').fix.includes('Sit before it builds')"));
}

/* ---------- 7. PIN (async) ---------- */
{
  const w = loadApp(null);
  await E(w, "pinCreate('9753')");
  check('pin: record is salted hash, no plaintext', E(w, "!!S.profile.pinRecord && S.profile.pinRecord.hashB64.length>20 && !JSON.stringify(S.profile).includes('9753')"));
  check('pin: correct PIN verifies', await E(w, "pinCheck('9753')") === true);
  check('pin: wrong PIN rejected', await E(w, "pinCheck('0000')") === false);
  check('pin: export strips PIN material', E(w, "(()=>{const j=JSON.stringify(bfPublicState());return !j.includes(S.profile.pinRecord.hashB64) && !j.includes('pinRecord')})()"));
  check('pin: lockout schedule escalates, capped at 2h', E(w, 'pinLockMs(3)') === 30000 && E(w, 'pinLockMs(5)') === 300000 && E(w, 'pinLockMs(8)') === 1800000 && E(w, 'pinLockMs(9)') === 3600000 && E(w, 'pinLockMs(30)') === 7200000);
  const w2 = loadApp(w.localStorage.getItem('backforge_v1'));
  check('pin: gate shows on reload when PIN set', w2.document.getElementById('pinGate').classList.contains('open'));
}

/* ---------- 8. Vault (async) ---------- */
{
  const w = loadApp(null);
  const out = await E(w, "(async()=>{ const salt='AAAAAAAAAAAAAAAAAAAAAA=='; const k1=await vaultDerive('a-strong-passphrase',salt,1000); const k2=await vaultDerive('wrong-passphrase',salt,1000); const data=new TextEncoder().encode('posture-photo-bytes'); const enc=await vaultEncBytes(k1,'vf-test',data); const dec=await vaultDecBytes(k1,'vf-test',enc.iv,enc.ct); let wrongFailed=false; try{ await vaultDecBytes(k2,'vf-test',enc.iv,enc.ct); }catch(e){ wrongFailed=true } return { same: new TextDecoder().decode(dec)==='posture-photo-bytes', wrongFailed }; })()");
  check('vault: AES-GCM round-trip is byte-identical', out.same === true);
  check('vault: wrong passphrase fails cleanly', out.wrongFailed === true);
}

/* ---------- 9. Sync v2 + v1 compat ---------- */
{
  const w = loadApp(null);
  const v2 = { kind: 'backforge-health-sync', version: 2, generatedAt: new Date().toISOString(), inReplyTo: 'bf-test1', days: [
    { date: today, steps: 8000, zone2Min: 20, sleepMin: 450, sleepDeepMin: 80, sleepScore: null, weightKg: 84, caloriesIn: 2100, caloriesOut: 2600 },
    { date: daysAgo(1), steps: 7000, zone2Min: 0, sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: null, caloriesIn: -50, caloriesOut: 'x' }
  ], calories: { method: 'test', sources: ['t'] } };
  E(w, "S.syncReq.lastRequestId='bf-test1'");
  check('sync v2: imports', E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(v2)) + ')') === true);
  check('sync v2: calories merged', E(w, 'S.health.days[' + JSON.stringify(today) + '].caloriesIn') === 2100 && E(w, 'S.health.days[' + JSON.stringify(today) + '].caloriesOut') === 2600);
  check('sync v2: invalid calories dropped to null, never faked', E(w, 'S.health.days[' + JSON.stringify(daysAgo(1)) + '].caloriesIn') === null);
  check('sync v2: inReplyTo marks request fulfilled', E(w, 'S.syncReq.fulfilledBy') === 'bf-test1');
  const v1 = { kind: 'backforge-health-sync', version: 1, generatedAt: 'x', days: [{ date: daysAgo(2), steps: 5000, zone2Min: 5, sleepMin: 400, sleepDeepMin: 50, sleepScore: null, weightKg: 85 }] };
  check('sync v1: legacy payload still imports', E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(v1)) + ')') === true && E(w, 'S.health.days[' + JSON.stringify(daysAgo(2)) + '].steps') === 5000);
  E(w, "makeSyncRequest('calories')");
  check('sync: request creation records requestId (spec shape)', /^sync_/.test(E(w, 'S.syncReq.lastRequestId')));
}

/* ---------- 10. Posture result import ---------- */
{
  const w = loadApp(null);
  E(w, 'importPostureResult()');
  const good = { kind: 'backforge-posture-result', version: 1, inReplyTo: 'bfp-x', patterns: { pelvicTilt: { grade: 'moderate', confidence: 0.8, viewsUsed: ['side-right'] }, forwardHead: { grade: 'banana', confidence: 1, viewsUsed: [] } }, notes: 'Shoulders rounded.' };
  w.document.getElementById('postureJson').value = JSON.stringify(good);
  E(w, 'savePostureResult()');
  check('posture import: valid grade kept', E(w, 'S.posture.assessments.length') === 1 && E(w, "S.posture.assessments[0].patterns.pelvicTilt.grade") === 'moderate');
  check('posture import: unknown grade dropped, not stored', E(w, "S.posture.assessments[0].patterns.forwardHead") === undefined);
  check('posture import: creates NO findings (plan untouched)', E(w, 'S.posture.findings.length') === 0);
}

/* ---------- 11. Body plan ---------- */
{
  const w = loadApp(null);
  E(w, "S.profile={displayName:'T',pinRecord:null,lock:{fails:0,lockedUntil:0},heightCm:173,birthYear:1990}; S.bodyweightKg=85; save(); renderBodyPlan();");
  const txt = w.document.getElementById('bodyPlanCard').innerHTML;
  check('body plan: renders TDEE + deficit + protein floor', /maintenance \(TDEE\)/.test(txt) && /Protein floor/.test(txt) && /136 g\/day/.test(txt), txt.slice(0, 200));
  check('body plan: honesty footer present (spec verbatim)', /General information, not medical advice/.test(txt));
  E(w, "S.checkins=[{date:'" + today + "',pain:8,where:'back',sleep:'ok'}]; renderBodyPlan();");
  check('body plan: flare pain switches target to maintenance message', /Back first/.test(w.document.getElementById('bodyPlanCard').innerHTML));
  E(w, "S.weightLog.push({date:'" + today + "',kg:84.1,source:'manual'});");
  check('body plan: manual weight log wins as latest weight', E(w, 'latestWeightKg()') === 84.1);
}

/* ---------- 12. Travel reset ---------- */
{
  const w = loadApp(null);
  E(w, 'startTravelReset()');
  check('travel: reset builds an 8-move no-equipment session', E(w, 'new Set(LPL.steps.map(s=>s.found)).size') === 8 && E(w, "LPL.steps.every(s=>EXBY[s.found].band==='none')"), E(w, 'LPL.steps.map(s=>s.found).join(",")'));
}

/* ---------- 13. Iteration-1 adversarial regressions ---------- */
{
  const w = loadApp(null);
  E(w, 'startBandCheck()');
  check('adv1 C1: wizard opens at intro', E(w, 'WZ.step') === 0);
  E(w, 'wzNext()');
  check('adv1 C1: wzNext blocked on unanswered test', E(w, 'WZ.step') === 1);
  E(w, "WZ.inputs['tilt-control']={skip:true}; wzNext();");
  check('adv1 C1: explicit skip advances', E(w, 'WZ.step') === 2);
  const w2 = loadApp(null);
  E(w2, "WZ={step:8,band:'light',inputs:{}}; PTESTS.forEach(t=>WZ.inputs[t.id]={}); wzFinish();");
  check('adv1 C1: fully-unanswered wizard records NO check', E(w2, 'S.posture.bandChecks.length') === 0 && E(w2, 'S.posture.findings.length') === 0);
  check('adv1 m1: combineGrades Priority+Mild+Mild = Moderate (spec formula)', E(w, "combineGrades(['Priority','Mild','Mild'])") === 'Moderate');
  const g = (id, inp) => E(w, 'PTESTS.find(t=>t.id===' + JSON.stringify(id) + ').grade(' + JSON.stringify(inp) + ')');
  check('adv1 m2: tilt 10-19 + breath-hold caps at Mild', g('tilt-control', { hold: '2', quality: 'breath' }) === 'Mild');
  check('adv1 m2: tilt 20+ + shakes caps at Moderate', g('tilt-control', { hold: '3', quality: 'shakes' }) === 'Moderate');
  check('adv1 M3: tilt is the long-band test now', E(w, "PTESTS.find(t=>t.id==='tilt-control').equip.includes('Long band')"));
  check('adv1 M3: glutemed is the wall press now', E(w, "PTESTS.find(t=>t.id==='glutemed-wall').setup.includes('press the outside knee into the wall')"));
  check('adv1 m3: glutemed front-of-hip at 20s = Moderate (one grade worse)', g('glutemed-wall', { hold: '3', quality: 'foh' }) === 'Moderate');
  const big = await E(w, "(async()=>{ const u=new Uint8Array(300000); for(let i=0;i<u.length;i+=65536) crypto.getRandomValues(u.subarray(i,i+65536)); const s=b64e(u.buffer); const back=b64d(s); return back.length===300000 && back[12345]===u[12345]; })()");
  check('adv1 C2: base64 round-trips a 300 KB photo-sized buffer', big === true);
  const poison = { kind: 'backforge-health-sync', version: 2, generatedAt: 'x', days: [{ date: today, steps: -500, zone2Min: 'lots', sleepMin: null, sleepDeepMin: null, sleepScore: null, weightKg: 'heavy', caloriesIn: 2000, caloriesOut: 2500 }] };
  check('adv1 M5: poisoned payload imports but fields are nulled', E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(poison)) + ')') === true && E(w, 'S.health.days[' + JSON.stringify(today) + '].steps') === null && E(w, 'S.health.days[' + JSON.stringify(today) + '].weightKg') === null);
  check('adv1 M5: Progress renders after poisoned import', (() => { try { E(w, "go('progress')"); return true; } catch (e) { return 'threw: ' + e.message; } })() === true);
  const w3 = loadApp(null);
  E(w3, "S.checkins=[{date:todayStr(),pain:9,where:'back',sleep:'ok'}]; S.posture.bandChecks=[];");
  E(w3, 'startTravelReset()');
  check('adv1 M1: flare-day travel reset routes to relief moves only', E(w3, "LPL && LPL.steps.length>0 && LPL.steps.every(s=>['kneechest','figure4','catcamel'].includes(s.found))"), E(w3, "LPL?LPL.steps.map(s=>s.found).join(','):'no LPL'"));
  E(w3, 'startBandCheck()');
  check('adv1 M1: band check hard-stops on a flare day', E(w3, 'typeof WZ') === 'object' && E(w3, 'WZ') === null);
  const w4 = loadApp(null);
  E(w4, 'importPostureResult()');
  const bad = { kind: 'backforge-posture-result', version: 99, patterns: { pelvicTilt: { grade: 'mild', confidence: 5, viewsUsed: ['mars'] } } };
  w4.document.getElementById('postureJson').value = JSON.stringify(bad);
  E(w4, 'savePostureResult()');
  check('adv1 m5: posture result with wrong version is rejected', E(w4, 'S.posture.assessments.length') === 0);
  const w5 = loadApp(null);
  await new Promise(r => setTimeout(r, 900));
  check('adv1 M10: first run offers PIN setup', (w5.document.getElementById('sheet').innerHTML || '').includes('Protect BackForge with a PIN'));
}

/* ---------- 14. Iteration-2 adversarial regressions ---------- */
{
  const w = loadApp(null);
  const full = {
    'tilt-control': { hold: '3', quality: 'flat', pain: 'none' },
    'deadbug-band': { reps: '2', quality: 'heavy', pain: 'none' },
    'hip-ir-band': { rR: '0', rL: '3', quality: 'still', pain: 'none' },
    'pallof-hold': { hold: '3', quality: 'clean', sides: 'similar', pain: 'none' },
    'glutemed-wall': { hold: '3', quality: 'clean', pain: 'none' },
    'pullapart-endurance': { reps: '3', quality: 'clean', pain: 'none' },
    'wallslide-band': { reps: '3', quality: 'holds', pain: 'none' },
    'chintuck-band': { reps: '3', quality: 'glide', pain: 'none' }
  };
  E(w, 'WZ = { step: 8, band: "light", inputs: ' + JSON.stringify(full) + ' }; wzFinish();');
  check('adv2 N2: full check grades IR Priority', E(w, "S.posture.bandChecks[0].grades['hip-ir-band']") === 'Priority');
  const partial = JSON.parse(JSON.stringify(full));
  Object.keys(partial).forEach(k => { if (k !== 'tilt-control') partial[k] = { skip: true }; });
  E(w, 'WZ = { step: 8, band: "light", inputs: ' + JSON.stringify(partial) + ' }; wzFinish();');
  check('adv2 N2: partial retest MERGES — IR grade + findings survive', E(w, "S.posture.bandChecks.length") === 2 && E(w, "S.posture.bandChecks[1].grades['hip-ir-band']") === 'Priority' && E(w, "S.posture.bandChecks[1].carried['hip-ir-band']") === E(w, "S.posture.bandChecks[0].date") && E(w, "S.posture.findings.some(f=>f.t.includes('internal rotation deficit'))"));
  const g = (id, inp) => E(w, 'PTESTS.find(t=>t.id===' + JSON.stringify(id) + ').grade(' + JSON.stringify(inp) + ')');
  check('adv2 N8: hip IR full range + trunk lean caps at Mild', g('hip-ir-band', { rR: '3', rL: '3', quality: 'lean' }) === 'Mild');
  check('adv2 N8: glutemed front-of-hip 10-19s = Moderate (not Priority)', g('glutemed-wall', { hold: '2', quality: 'foh' }) === 'Moderate');
  check('adv2 N8: wallslide 7-9 + head poke = Mild', g('wallslide-band', { reps: '2', quality: 'poke' }) === 'Mild');
  check('adv2 N8: chin tuck 7-9 + breath-hold = Mild', g('chintuck-band', { reps: '2', quality: 'breath' }) === 'Mild');
  const sleepPayload = { kind: 'backforge-health-sync', version: 2, generatedAt: 'x', days: [{ date: today, steps: 8000, zone2Min: 20, sleepMin: 450, sleepDeepMin: 80, sleepScore: null, weightKg: 84 }] };
  E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(sleepPayload)) + ')');
  check('adv2 N3: sleep series derives hours from sleepMin', E(w, "healthDays(7).length") === 1 && Math.abs(E(w, "healthDays(7)[0].sleepH") - 7.5) < 1e-9);
  check('adv2 N5: zone2 null stays null (never faked to 0)', E(w, "(()=>{const p={kind:'backforge-health-sync',version:2,days:[{date:'" + daysAgo(1) + "',steps:100,zone2Min:null,sleepMin:null,sleepDeepMin:null,sleepScore:null,weightKg:null}]};importHealthSync(JSON.stringify(p));return S.health.days['" + daysAgo(1) + "'].zone2Min})()") === null);
  check('adv2 N5: impossible date 2026-02-31 is rejected', E(w, "(()=>{const p={kind:'backforge-health-sync',version:2,days:[{date:'2026-02-31',steps:100,zone2Min:1,sleepMin:60,sleepDeepMin:1,sleepScore:1,weightKg:80}]};importHealthSync(JSON.stringify(p));return S.health.days['2026-02-31']})()") === undefined);
  check('adv2 N5: 900 kg weight is rejected to null', E(w, "(()=>{const p={kind:'backforge-health-sync',version:2,days:[{date:'" + daysAgo(2) + "',steps:100,zone2Min:1,sleepMin:60,sleepDeepMin:1,sleepScore:1,weightKg:900}]};importHealthSync(JSON.stringify(p));return S.health.days['" + daysAgo(2) + "'].weightKg})()") === null);
  E(w, "S.weightLog=[{date:'2026-08-01',kg:70,source:'manual'}]; S.health.days['" + today + "'].weightKg=95;");
  check('adv2 N9: latest weight is by date across sources (synced 95 wins)', E(w, 'latestWeightKg()') === 95);
  const wBad = loadApp(JSON.stringify({ v: 1, schema: 3, answers: {}, results: null, assessHistory: [], log: [], checkins: [], bandLevel: {}, swaps: {}, player: null, reminder: null, livePrefs: null, exLog: [], livePlayer: null, protein: {}, bodyweightKg: null, deloadUntil: null, health: { days: {}, meta: null, paused: false, lastSyncAt: null }, waist: [], backup: { destination: '', lastExportAt: null }, migratedFrom: null, posture: { cues: {} } }));
  check('adv2 N4: corrupt schema-3 posture subfields are repaired at load', E(wBad, "Array.isArray(S.posture.bandChecks) && Array.isArray(S.posture.captures) && Array.isArray(S.posture.assessments)"));
  check('adv2 N4: app still renders Home after corrupt seed', (() => { try { E(wBad, "go('today')"); return true; } catch (e) { return 'threw: ' + e.message; } })() === true);
}

/* ---------- 15. Iteration-3 regressions (NF1, NF3) ---------- */
{
  const w = loadApp(null);
  const withPain = {
    'tilt-control': { hold: '3', quality: 'flat', pain: 'leg' },
    'deadbug-band': { reps: '2', quality: 'heavy', pain: 'none' },
    'hip-ir-band': { rR: '3', rL: '3', quality: 'still', pain: 'none' },
    'pallof-hold': { hold: '3', quality: 'clean', sides: 'similar', pain: 'none' },
    'glutemed-wall': { hold: '3', quality: 'clean', pain: 'none' },
    'pullapart-endurance': { reps: '3', quality: 'clean', pain: 'none' },
    'wallslide-band': { reps: '3', quality: 'holds', pain: 'none' },
    'chintuck-band': { reps: '3', quality: 'glide', pain: 'none' }
  };
  E(w, 'WZ = { step: 8, band: "light", inputs: ' + JSON.stringify(withPain) + ' }; wzFinish();');
  check('adv3 NF1: pain-flagged check records painFlag', E(w, 'S.posture.bandChecks[0].painFlag') === true);
  const partial2 = JSON.parse(JSON.stringify(withPain));
  Object.keys(partial2).forEach(k => { if (k !== 'deadbug-band') partial2[k] = { skip: true }; });
  E(w, 'WZ = { step: 8, band: "light", inputs: ' + JSON.stringify(partial2) + ' }; wzFinish();');
  check('adv3 NF1: partial retest carries the pain event (flag + provenance)', E(w, 'S.posture.bandChecks[1].painFlag') === true && !!E(w, "S.posture.bandChecks[1].carriedPain['tilt-control']"));
  check('adv3 NF1: physio-flag finding survives the merge', E(w, "S.posture.findings.some(f=>/physio flag/.test(f.t))"));
  const calPayload = { kind: 'backforge-health-sync', version: 2, generatedAt: 'x', days: [{ date: today, steps: 8000, zone2Min: 20, sleepMin: 450, sleepDeepMin: 80, sleepScore: null, weightKg: 84, caloriesIn: 2100, caloriesOut: 2600 }] };
  E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(calPayload)) + ')');
  E(w, 'deleteHealthSync()');
  check('adv3 NF3: delete clears calDays to its canonical object shape', E(w, "typeof S.nutrition.calDays==='object' && !Array.isArray(S.nutrition.calDays) && Object.keys(S.nutrition.calDays).length===0"));
  E(w, 'importHealthSync(' + JSON.stringify(JSON.stringify(calPayload)) + ')');
  check('adv3 NF3: delete -> re-import -> body plan renders without throwing', (() => { try { E(w, "S.profile={displayName:'T',pinRecord:null,lock:{fails:0,lockedUntil:0},heightCm:173,birthYear:1990}; renderBodyPlan(); go('progress')"); return true; } catch (e) { return 'threw: ' + e.message; } })() === true);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
