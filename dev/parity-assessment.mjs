/* Parity (v4.7): after the physio review (docs/reviews/PHYSIO-REVIEW-2026-11.md)
   the movement scoring and three band graders DELIBERATELY differ from the classic
   app. This harness now proves the graders the review said to leave alone are still
   identical to classic: tilt-control, hip-ir-band, pallof-hold, glutemed-wall,
   pullapart-endurance, wallslide-band. (v4.6 movement parity: 3000/3000 before the review.)
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
const classicIds = ['tilt-control', 'hip-ir-band', 'pallof-hold', 'glutemed-wall', 'pullapart-endurance', 'wallslide-band'];
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
