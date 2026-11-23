// Data files Muse maintains: shape checks so a bad import fails loudly here, not in the app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { json, lib, lines } from './helpers.mjs';
import { parseHealthPayload, rebase } from '../app/js/store.js';

test('every exercise has the fields the app needs', () => {
  const seen = new Set();
  for (const e of lib.all) {
    assert.ok(!seen.has(e.id), 'duplicate id ' + e.id); seen.add(e.id);
    for (const k of ['id', 'name', 'category', 'dose']) assert.ok(e[k], `${e.id} missing ${k}`);
    assert.ok(Array.isArray(e.cues) && e.cues.length >= 1, `${e.id} needs at least one cue (the coach reads it)`);
  }
});
test('coaching.json only references known exercises; videos have a type', () => {
  for (const [id, c] of Object.entries(json('data/coaching.json').exercises)) {
    assert.ok(lib.get(id), 'coaching entry for unknown exercise ' + id);
    for (const v of c.videos || []) assert.ok(['direct', 'search'].includes(v.type) && /^https:\/\//.test(v.url), id);
  }
});
test('voice lines: every category is a non-empty list of short lines', () => {
  for (const [k, v] of Object.entries(lines)) {
    if (k.startsWith('_')) continue;
    const pools = Array.isArray(v) ? [v] : Object.values(v);
    for (const p of pools) { assert.ok(p.length, k); for (const l of p) assert.ok(l.split(' ').length <= 22, `${k}: too long: ${l}`); }
  }
});
test('health import validates and never zero-fills', () => {
  const r = parseHealthPayload({ days: [{ date: '2026-11-01', steps: 8000, restingHr: 61, hrvMs: 48, sleepMin: -5, weightKg: 'x' }, { date: 'bad' }] });
  assert.deepEqual(r.days['2026-11-01'], { steps: 8000, restingHr: 61, hrvMs: 48 });
  assert.equal(r.skipped, 1);
  assert.throws(() => parseHealthPayload({ nope: 1 }));
  const sample = parseHealthPayload(json('tools/sample-payload/backforge-health-sync.json'));
  assert.ok(Object.keys(sample.days).length > 0, 'v1 payload from tools/health_sync.py still imports');
});
test('demo data rebases so its last day is today', () => {
  const doc = json('data/demo/demo-state.json');
  const st = rebase(doc.state, doc.anchor, '2027-01-10');
  assert.ok(st.health.days['2027-01-10']); assert.equal(st.log.at(-1).date <= '2027-01-10', true);
});
