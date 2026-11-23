// Real-browser smoke test (Playwright + Chromium). Not part of `node --test`;
// run: python3 -m http.server 8765 & node tests/smoke.browser.mjs
// Checks every screen renders with no JS errors (real + demo data), and that the
// Live player runs in real time and speaks (captions appear).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('skip: playwright not installed'); process.exit(0); }
const U = process.env.BF_URL || 'http://localhost:8765/';
const b = await chromium.launch(); const errs = []; let pass = 0;
const ok = (n, c) => { if (c) { pass++; console.log('ok   - ' + n); } else { errs.push(n); console.log('FAIL - ' + n); } };
for (const [vp, label] of [[{ width: 390, height: 844 }, 'phone'], [{ width: 1180, height: 820 }, 'tablet'], [{ width: 1440, height: 900 }, 'desktop']]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: 'dark' });
  const p = await ctx.newPage(); const pe = [];
  p.on('pageerror', e => pe.push(e.message));
  for (const r of ['today', 'live', 'moves', 'moves/birddog', 'progress/overview', 'progress/health', 'progress/body', 'progress/posture', 'you', 'checkup', 'checkup/movement', 'checkup/posture', 'checkup/photos', 'desk', 'learn', 'learn/live', 'you/kit', 'you/privacy']) {
    await p.goto(U + '#/' + r); await p.waitForTimeout(400);
    ok(`${label} #/${r} renders`, (await p.locator('main h1, dialog[open] h2').count()) > 0);
  }
  await p.goto(U + '?demo=1#/today'); await p.waitForTimeout(1200);
  ok(`${label} demo: health strip shows`, (await p.locator('text=Resting HR').count()) > 0);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${label} no horizontal scroll`, !overflow);
  ok(`${label} no page errors`, pe.length === 0); if (pe.length) console.log(pe.join('\n'));
  await ctx.close();
}
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto(U + '#/live/play?mins=10&energy=ok'); await p.waitForTimeout(4000);
const cap = await p.locator('#live-caption').innerText();
ok('player: coach caption appears within 4 s', cap.trim().length > 0);
// first run: a fresh user sees the welcome, can tick equipment, and it never shows again
{ const p3 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p3.goto(U + '#/today'); await p3.waitForTimeout(900);
  ok('first run: welcome sheet shows', (await p3.locator('dialog[open] >> text=Your back coach').count()) === 1);
  await p3.getByRole('button', { name: 'Set up' }).click(); await p3.locator('dialog[open] .kit-item').filter({ hasText: 'Foam roller' }).click();
  await p3.getByRole('button', { name: 'Next' }).click(); await p3.getByRole('link', { name: 'Train first' }).click(); await p3.waitForTimeout(400);
  const st = await p3.evaluate(() => JSON.parse(localStorage.getItem('backforge_v1')));
  ok('first run: equipment saved and onboarding done', st.kit.items.includes('foam-roller') && !!st.ui.onboarded);
  await p3.goto(U + '#/today'); await p3.waitForTimeout(600); ok('first run: not shown again', (await p3.locator('dialog[open]').count()) === 0); }
const t1 = await p.locator('.player-left').innerText(); await p.waitForTimeout(2100); const t2 = await p.locator('.player-left').innerText();
ok('player: clock counts down in real time', t1 !== t2);
await p.keyboard.press(' '); const a = await p.locator('.player-left').innerText(); await p.waitForTimeout(1500);
ok('player: Space pauses (sheet opens or clock stops)', a === (await p.locator('.player-left').innerText()));
// posture check end to end: answer every test by clicking, finish, exactly one check recorded
{
  const c2 = await b.newContext({ viewport: { width: 1180, height: 820 } });
  await c2.addInitScript(() => { if (!localStorage.getItem('backforge_v1')) localStorage.setItem('backforge_v1', JSON.stringify({ v: 1, ui: { onboarded: 'test' } })); });
  const p2 = await c2.newPage(); const pe = [];
  p2.on('pageerror', e => pe.push(e.message));
  await p2.goto(U + '#/checkup/posture'); await p2.waitForTimeout(700);
  await p2.getByRole('button', { name: /Start — test 1 of 15/ }).click();
  for (let i = 0; i < 15; i++) {
    const groups = p2.locator('.choice-list');
    const n = await groups.count();
    for (let g = 0; g < n; g++) await groups.nth(g).locator('.choice').nth(1).click();
    await p2.getByRole('button', { name: i === 14 ? 'See my grades' : 'Next', exact: true }).click(); await p2.waitForTimeout(80);
  }
  await p2.waitForTimeout(400);
  ok('posture check: grades screen shows', (await p2.locator('text=Your posture grades').count()) > 0);
  const nChecks = await p2.evaluate(() => JSON.parse(localStorage.getItem('backforge_v1')).posture.bandChecks.length);
  ok('posture check: recorded exactly once', nChecks === 1);
  ok('posture check: plan card offers a posture session', (await p2.locator('text=Start posture session').count()) > 0);
  await p2.goto(U + '#/live/play?variant=posture&mins=10&energy=ok'); await p2.waitForTimeout(2500);
  ok('posture session: player runs', (await p2.locator('.player').count()) === 1);
  ok('posture check flow: no page errors', pe.length === 0);
}
// sound on phones: strict autoplay (like iPhone Safari). Observed passively — calling into the app counts as a tap.
{
  const sb = await chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const init = () => { localStorage.setItem('backforge_v1', JSON.stringify({ v: 1, ui: { onboarded: 'x' } })); const O = window.AudioContext; window.__ctxs = []; window.AudioContext = class extends O { constructor(...a) { super(...a); window.__ctxs.push(this); } }; const S = window.AudioBufferSourceNode.prototype.start; window.__clips = 0; window.AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.duration > 0.2) window.__clips++; return S.apply(this, a); }; };
  const c1 = await sb.newContext({ viewport: { width: 390, height: 844 } }); await c1.addInitScript(init);
  const q = await c1.newPage(); await q.goto(U + '#/live/play?mins=10&energy=ok'); await q.waitForTimeout(2500);
  ok('sound: blocked audio shows "Tap for sound"', await q.evaluate(() => window.__ctxs.every(c => c.state !== 'running') && !!document.querySelector('.sound-gate')));
  await q.locator('.sound-gate').click({ timeout: 5000 }); await q.waitForTimeout(6000);
  ok('sound: one tap starts audio and the coach voice plays recorded clips', await q.evaluate(() => window.__ctxs[0].state === 'running' && !document.querySelector('.sound-gate') && window.__clips > 0));
  const c2 = await sb.newContext({ viewport: { width: 390, height: 844 } }); await c2.addInitScript(init);
  const q2 = await c2.newPage(); await q2.goto(U + '#/live'); await q2.waitForTimeout(1500); await q2.getByRole('button', { name: /Start/ }).first().click(); await q2.waitForTimeout(3000);
  ok('sound: tapping Start unlocks audio (no extra tap needed)', await q2.evaluate(() => window.__ctxs[0]?.state === 'running' && !document.querySelector('.sound-gate')));
  await sb.close();
}
await b.close();
console.log(`\n${pass} passed, ${errs.length} failed`); process.exit(errs.length ? 1 : 0);
