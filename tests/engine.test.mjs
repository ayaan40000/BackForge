// Safety invariants + builder behaviour for the new app's engine (app/js/engine).
// Run all: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, AYAAN } from './helpers.mjs';
import { makeCtx } from '../app/js/engine/context.js';
import { buildLive } from '../app/js/engine/live.js';
import { exclusionReason } from '../app/js/engine/library.js';
import { prescribe, parseDose } from '../app/js/engine/dose.js';
import { readiness, streak, gate } from '../app/js/engine/progress.js';

const TODAY = '2026-11-23';
const S = (o = {}) => ({ results: AYAAN, checkins: [], log: [], exLog: [], ...o });
const ids = w => w.sections.flatMap(s => s.items.map(i => i.id));
const MINS = [5, 10, 20, 35, 50, 60];
const CAVS = [[], ['standing'], ['knees'], ['noband'], ['quiet'], ['right'], ['left'], ['standing', 'noband', 'knees']];

test('extension-intolerant profile never gets extension moves', () => {
  for (const mins of MINS) for (const caveats of CAVS) {
    const w = buildLive(lib, makeCtx(S(), TODAY), { mins, energy: 'ok', caveats });
    for (const id of ids(w)) assert.equal(lib.get(id).spinal_load === 'extension', false, `${id} at ${mins}/${caveats}`);
    for (const bad of ['pressup', 'sphinx', 'proneext']) assert.ok(!ids(w).includes(bad));
  }
});
test('no loaded flexion/rotation, no both-knees-to-chest, every served move passes the safety layer', () => {
  const flags = new Set(['extension-intolerant']);
  for (const mins of MINS) for (const energy of ['great', 'ok', 'low']) {
    const w = buildLive(lib, makeCtx(S(), TODAY), { mins, energy, caveats: [] });
    for (const id of ids(w)) assert.equal(exclusionReason(lib.get(id), flags), null, id);
  }
  assert.ok(exclusionReason({ id: 'bothkneestochest', name: 'Both knees to chest' }, new Set()));
  assert.ok(exclusionReason({ id: 'x', name: 'Banded crunch', category: 'strength', spinal_load: 'flexion' }, new Set()));
});
test('pain ≥ 7 today → relief only, whatever was asked for', () => {
  const w = buildLive(lib, makeCtx(S({ checkins: [{ date: TODAY, pain: 8, sleep: 'ok' }] }), TODAY), { mins: 50, energy: 'great', caveats: [] });
  assert.equal(w.kind, 'flare');
  for (const id of ids(w)) assert.ok(['relief', 'cooldown', 'warmup', 'mobility'].includes(lib.get(id).category), id);
  assert.ok(!ids(w).includes('qlreach'), 'v4.0 rule: no side-bend in the flare protocol');
});
test('caveats are honoured', () => {
  const ctx = makeCtx(S(), TODAY);
  const noBand = buildLive(lib, ctx, { mins: 35, energy: 'ok', caveats: ['noband'] });
  for (const id of ids(noBand)) assert.ok(!(lib.get(id).equipment || []).some(e => e === 'band' || e === 'mini-band'), id);
  const standing = buildLive(lib, ctx, { mins: 35, energy: 'ok', caveats: ['standing'] });
  for (const id of ['sidesteps', 'march9090', 'wallsquat', 'pullthrough']) assert.ok(!ids(standing).includes(id));
  const low = buildLive(lib, ctx, { mins: 35, energy: 'low', caveats: [] });
  for (const s of low.sections) for (const i of s.items) assert.ok(parseDose(i.dose).sets <= 2, i.dose);
});
test('cool-down never repeats a main-work move', () => {
  for (const mins of MINS) {
    const w = buildLive(lib, makeCtx(S(), TODAY), { mins, energy: 'ok', caveats: [] });
    const main = w.sections.find(s => s.tag === 'main')?.items.map(i => i.id) || [];
    const cool = w.sections.find(s => s.tag === 'cool')?.items.map(i => i.id) || [];
    assert.deepEqual(cool.filter(i => main.includes(i)), []);
  }
});
test('dose reader', () => {
  assert.deepEqual([prescribe('3 × 8 · 8-sec holds').reps, prescribe('3 × 8 · 8-sec holds').repHoldSec], [8, 8]);
  assert.equal(prescribe('3 × 20–30 sec / side').holdSec, 20);
  assert.equal(prescribe('3 × 20–30 sec / side').perSide, true);
  assert.equal(prescribe('30 sec / side').holdSec, 30);
  assert.equal(prescribe('3–5 min').durationSec, 180);
  assert.equal(prescribe('2 × 20-sec holds').holdSec, 20);
  assert.equal(prescribe('8 reps alternating · 20-sec holds').alternating, true);
  for (const e of lib.all) { const p = prescribe(e.dose); assert.ok(p.reps || p.holdSec || p.durationSec, e.dose); }
});
test('readiness, streak and gate match the classic rules', () => {
  const ck = [{ date: '2026-11-22', pain: 4, sleep: 'ok' }, { date: TODAY, pain: 2, sleep: 'great' }];
  const r = readiness(makeCtx(S({ checkins: ck }), TODAY));
  assert.equal(r.score, 98 /* 70+10+10+10 capped at 98 */); assert.equal(r.level, 'full');
  assert.equal(readiness(makeCtx(S({ checkins: [{ date: TODAY, pain: 7 }] }), TODAY)).level, 'relief');
  const log = ['2026-11-20', '2026-11-21', '2026-11-22'].map(date => ({ date }));
  assert.equal(streak(makeCtx(S({ log }), TODAY)), 3);
  assert.equal(gate(makeCtx(S({ checkins: ck }), TODAY)).status, 'warming');
});
