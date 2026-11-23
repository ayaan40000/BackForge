/* One-off migration: copies the classic app's test definitions (text + options)
   into data/assessments/*.json. Grading/scoring stays in code (app/js/engine/). */
import fs from 'fs';
const L = fs.readFileSync(new URL('../classic/index.html', import.meta.url), 'utf8').split('\n');
const grab = (start, endRe) => { const i = L.findIndex(l => l.startsWith(start)); let j = i; while (!endRe.test(L[j])) j++; return L.slice(i, j + 1).join('\n'); };
const TESTS = new Function(grab('const TESTS=[', /^\];/) + '\nreturn TESTS;')();
const ph = L.findIndex(l => l.startsWith('const GSEV')); 
const helpers = L.slice(ph, ph + 15).join('\n');
const PT = new Function(helpers + '\n' + grab('const PTESTS=[', /^\];/) + '\nreturn {PTESTS, PAIN_OPTS};')();
const mv = TESTS.map(t => ({ id: t.id, name: t.n, domain: t.dom, how: t.how, why: t.why, kind: t.kind, options: t.opts || null }));
const band = PT.PTESTS.map(t => ({ id: t.id, name: t.name, pattern: t.pattern === 'upper' ? 'upper' : 'apt', kind: 'band', equipment: t.equip, setup: t.setup, inputs: t.inputs.map(i => ({ key: i.key, label: i.label, options: i.opts })), planChange: t.fix }));
fs.writeFileSync(new URL('../data/assessments/movement-tests.json', import.meta.url), JSON.stringify({ _about: 'The 13-test movement assessment (from classic v4.0). Text and options only — scoring is app/js/engine/assessment.js. Option values are stored in the user\'s answers: never rename a value.', tests: mv }, null, 1) + '\n');
// band tests were seeded into data/assessments/posture-tests.json once (v4.6); that file is now hand-maintained.

console.log(mv.length, 'movement tests written');
