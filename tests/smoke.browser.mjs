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
  for (const r of ['today', 'live', 'moves', 'moves/birddog', 'progress/overview', 'progress/health', 'progress/body', 'progress/posture', 'you', 'you/checkups']) {
    await p.goto(U + '#/' + r); await p.waitForTimeout(400);
    ok(`${label} #/${r} renders`, (await p.locator('main h1, dialog[open] h2').count()) > 0);
  }
  await p.goto(U + '?demo=1#/today'); await p.waitForTimeout(1200);
  ok(`${label} demo: health strip shows`, (await p.locator('text=Resting HR').count()) > 0);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${label} no horizontal scroll`, !overflow);
  ok(`${label} no page errors`, pe.length === 0);
  await ctx.close();
}
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p.goto(U + '#/live/play?mins=10&energy=ok'); await p.waitForTimeout(4000);
const cap = await p.locator('#live-caption').innerText();
ok('player: coach caption appears within 4 s', cap.trim().length > 0);
const t1 = await p.locator('.player-left').innerText(); await p.waitForTimeout(2100); const t2 = await p.locator('.player-left').innerText();
ok('player: clock counts down in real time', t1 !== t2);
await p.keyboard.press(' '); const a = await p.locator('.player-left').innerText(); await p.waitForTimeout(1500);
ok('player: Space pauses (sheet opens or clock stops)', a === (await p.locator('.player-left').innerText()));
await b.close();
console.log(`\n${pass} passed, ${errs.length} failed`); process.exit(errs.length ? 1 : 0);
