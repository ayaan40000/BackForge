/* Parity: the new engine (app/js/engine/assessment.js + posture.js) must score
   EXACTLY like the classic app for every answer combination we can throw at it.
   Loads classic/index.html in jsdom, then compares 3000 random movement-answer
   sets and 3000 random input sets per band test. Run: node dev/parity-assessment.mjs
   (jsdom from /tmp/bf-harness, same as the other harnesses). */
import { createRequire } from 'module';
import { webcrypto } from 'node:crypto';
import fs from 'fs';
const { JSDOM } = createRequire('/tmp/bf-harness/package.json')('jsdom');
const { scoreAssessment } = await import('../app/js/engine/assessment.js');
const { GRADERS } = await import('../app/js/engine/posture.js');
const MT = JSON.parse(fs.readFileSync(new URL('../data/assessments/movement-tests.json', import.meta.url))).tests;
const PT = JSON.parse(fs.readFileSync(new URL('../data/assessments/posture-tests.json', import.meta.url))).tests;
const html = fs.readFileSync(new URL('../classic/index.html', import.meta.url), 'utf8');
const w = new JSDOM(html, { url: 'https://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(win) {
  Object.defineProperty(win, 'crypto', { value: webcrypto }); win.TextEncoder = TextEncoder; win.TextDecoder = TextDecoder;
  win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, p) => (typeof p === 'string' ? () => {} : undefined), set: () => true });
  win.scrollTo = () => {}; win.URL.createObjectURL = () => 'blob:x';
} }).window;
let seed = 42; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pickOf = a => a[Math.floor(rnd() * a.length)];
let fail = 0, n = 0;
for (let i = 0; i < 3000; i++) {
  const ans = {};
  for (const t of MT) {
    if (rnd() < 0.15) continue;
    if (t.kind === 'opts') ans[t.id] = pickOf(t.options)[0];
    if (t.kind === 'sides') for (const s of ['L', 'R']) if (rnd() > 0.1) ans[`${t.id}_${s}`] = pickOf(t.options)[0];
    if (t.kind === 'nums') for (const s of ['L', 'R']) if (rnd() > 0.1) ans[`${t.id}_${s}`] = String(Math.floor(rnd() * 60));
  }
  w.eval(`S.answers = ${JSON.stringify(ans)}`);
  const a = JSON.stringify(w.eval('scoreAssessment()')), b = JSON.stringify(scoreAssessment(ans));
  n++; if (a !== b) { fail++; if (fail < 4) console.log('MOVEMENT MISMATCH', JSON.stringify(ans), '\n classic', a, '\n new    ', b); }
}
const classicIds = w.eval('PTESTS.map(t=>t.id)');
for (const id of classicIds) {
  const t = PT.find(x => x.id === id);
  for (let i = 0; i < 3000; i++) {
    const inp = Object.fromEntries(t.inputs.map(x => [x.key, pickOf(x.options)[0]]));
    const a = w.eval(`PTESTS.find(t=>t.id===${JSON.stringify(id)}).grade(${JSON.stringify(inp)})`), b = GRADERS[id](inp);
    n++; if (a !== b) { fail++; if (fail < 8) console.log('BAND MISMATCH', id, JSON.stringify(inp), a, b); }
  }
}
console.log(`${n - fail} identical, ${fail} different`);
process.exit(fail ? 1 : 0);
