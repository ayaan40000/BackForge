// Natural voice pack: every sentence the coach can say is enumerable (tools/voice_corpus.mjs),
// and real sessions only use enumerable sentences — so a rendered pack covers 100%.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { lib, lines, AYAAN } from './helpers.mjs';
import { makeCtx } from '../app/js/engine/context.js';
import { buildLive } from '../app/js/engine/live.js';
import { compile } from '../app/js/live/compiler.js';
import { scriptSession, transcript } from '../app/js/live/coach.js';
import { splitSentences } from '../app/js/live/sentences.js';

const corpus = new Set(JSON.parse(execFileSync('node', [new URL('../tools/voice_corpus.mjs', import.meta.url).pathname], { maxBuffer: 64e6 })).sentences);
const covers = t => splitSentences(t).every(s => corpus.has(s));

test('data/voice-corpus.json is current (run: node tools/voice_corpus.mjs --write)', () => {
  const saved = JSON.parse(fs.readFileSync(new URL('../data/voice-corpus.json', import.meta.url))).items.map(i => i.text);
  const fresh = [...corpus];
  const added = fresh.filter(t => !saved.includes(t));
  assert.deepEqual(added.slice(0, 3), [], `${added.length} new coach sentences are not in data/voice-corpus.json`);
});
test('every line a session speaks is in the voice corpus', () => {
  let total = 0, miss = [];
  for (const mins of [5, 20, 45]) for (const variant of ['standard', 'posture', 'desk']) {
    const S = { results: AYAAN, checkins: [], log: [], exLog: [], posture: { bandChecks: [{ date: '2026-11-20', grades: {}, summary: { apt: 'Moderate', hips: 'Priority', head: 'Mild', back: 'Moderate', shoulders: 'Mild' }, v: 3 }], formLog: [], findings: [] } };
    const ctx = makeCtx(S, '2026-11-23');
    const tl = scriptSession(compile(lib, buildLive(lib, ctx, { mins, variant, S }), { targetMin: mins }), lines, { mins, name: 'Ayaan', readiness: 'full', pain: 2, sleep: 'ok', weakSide: 'right', covers });
    for (const l of transcript(tl)) { total++; if (!covers(l.text)) miss.push(l.text); }
  }
  assert.ok(total > 300);
  assert.deepEqual(miss.slice(0, 5), [], `${miss.length} spoken lines are not in the corpus`);
});
test('voice pack is present and up to date (warning only)', () => {
  const idx = JSON.parse(fs.readFileSync(new URL('../app/voice/index.json', import.meta.url)));
  assert.ok(idx.packs.some(p => p.id === idx.default), 'app/voice/index.json: default must be one of packs');
  const m = new URL(`../app/voice/${idx.default}/manifest.json`, import.meta.url);
  if (!fs.existsSync(m)) { console.log('# no voice pack — the coach uses the device voice'); return; }
  const have = JSON.parse(fs.readFileSync(m)).sentences;
  const missing = [...corpus].filter(s => !have[s]);
  if (missing.length) console.log(`# voice pack is missing ${missing.length} sentences — rebuild with tools/render_voice.py (those lines fall back to captions / device voice)`);
  for (const [t, [f]] of Object.entries(have)) if (corpus.has(t)) assert.ok(fs.existsSync(new URL(`../app/voice/${idx.default}/` + f, import.meta.url)), 'manifest file missing: ' + f);
});
