// Live mode: duration fitting, coach timing rules, real-time player.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, lines, AYAAN } from './helpers.mjs';
import { makeCtx } from '../app/js/engine/context.js';
import { buildLive } from '../app/js/engine/live.js';
import { compile, locate } from '../app/js/live/compiler.js';
import { scriptSession, transcript, speakSec, makePicker } from '../app/js/live/coach.js';
import { LivePlayer } from '../app/js/live/player.js';

const TODAY = '2026-11-23';
const ctx = makeCtx({ results: AYAAN, checkins: [], log: [], exLog: [] }, TODAY);
const session = (mins, o = {}) => scriptSession(compile(lib, buildLive(lib, ctx, { mins, energy: 'ok', caveats: [], ...o }), { targetMin: mins }), lines, { mins, name: 'Ayaan', readiness: 'full' });

test('timeline lands within ±10% of the chosen duration', () => {
  for (const mins of [10, 15, 20, 30, 35, 45, 50, 60]) {
    const tl = session(mins);
    assert.ok(Math.abs(tl.totalSec - mins * 60) <= mins * 6, `${mins} min → ${(tl.totalSec / 60).toFixed(1)}`);
  }
});
test('timeline structure: intro first, outro last, rests between sets, sides paired', () => {
  const tl = session(20);
  assert.equal(tl.segments[0].type, 'intro'); assert.equal(tl.segments.at(-1).type, 'outro');
  for (let i = 1; i < tl.segments.length; i++) assert.ok(Math.abs(tl.segments[i].start - (tl.segments[i - 1].start + tl.segments[i - 1].sec)) < 1e-6);
  for (const s of tl.segments.filter(s => s.type === 'switch')) assert.equal(tl.segments[s.i + 1].type, 'work');
  assert.ok(tl.segments.some(s => s.type === 'rest'));
});
test('coach: every segment speaks, lines never overlap, nothing talks over the 3-2-1', () => {
  for (const mins of [5, 20, 50]) {
    const tl = session(mins);
    for (const s of tl.segments) {
      if (['prep', 'work', 'switch', 'intro', 'outro'].includes(s.type)) assert.ok(s.lines.length, `${s.type} #${s.i} is silent`);
      for (let i = 1; i < s.lines.length; i++) assert.ok(s.lines[i - 1].at + speakSec(s.lines[i - 1].text) <= s.lines[i].at + 0.05, `overlap in ${s.type} #${s.i}: ${s.lines[i - 1].text} / ${s.lines[i].text}`);
      if (s.type !== 'outro') for (const l of s.lines) if (l.kind !== 'safety') assert.ok(l.at + speakSec(l.text) <= s.sec - 3.2 + 1e-6, `talks in the closing quiet zone of ${s.type} #${s.i}: ${l.text}`);
      if (s.type === 'work') for (const l of s.lines) assert.ok(l.at >= 1.5, `talks in the 1.5 s after go: ${l.text}`);
    }
  }
});
test('coach: safety line in the opening, specific exercise named in every prep, close asks for pain', () => {
  const tl = session(20); const tx = transcript(tl);
  assert.ok(tl.segments[0].lines.some(l => l.kind === 'safety'));
  for (const s of tl.segments.filter(s => s.type === 'prep')) assert.ok(s.lines.some(l => l.text.includes(s.name)), s.name);
  assert.ok(tx.some(l => lines.logpain.includes(l.text)), 'the close asks for a pain score');
  for (const l of tx) assert.ok(!/\{\w+\}/.test(l.text), 'unfilled placeholder: ' + l.text);
  for (const l of tx) assert.ok(!/\b(cure|heal|diagnos|treat|fix your)\b/i.test(l.text) && !/no pain,? no gain/i.test(l.text), 'banned phrasing: ' + l.text);
});
test('picker never repeats the same line twice in a row', () => {
  const pick = makePicker({ a: ['x', 'y', 'z', 'w', 'v'] }, 3); const seq = [];
  for (let i = 0; i < 200; i++) seq.push(pick('a', {}, i * 1000));
  for (let i = 3; i < seq.length; i++) assert.ok(!seq.slice(i - 3, i).includes(seq[i]), 'repeated within the last 3');
  assert.equal(makePicker({ a: ['Hi {name}.', 'Hello.'] }, 1)('a', {}), 'Hello.', 'lines with unfilled placeholders are skipped');
});
test('player: drift-free clock, fires each cue once, pause/seek/extend', () => {
  let t = 0; const fired = [], beeps = [];
  const tl = session(10);
  const p = new LivePlayer(tl, { now: () => t, onCue: l => fired.push(l.text), onBeep: b => beeps.push(b.tone) });
  globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
  p.start();
  for (let s = 0; s < 60; s++) { t += 250; p.tick(); }
  const n15 = fired.length; assert.ok(n15 >= 3, 'intro lines fired');
  p.pause(); t += 600000; p.start(); p.tick();
  assert.equal(fired.length, n15, 'paused time does not advance the session');
  t += 30000; p.tick(); assert.ok(fired.length <= n15 + 2, 'a long gap fires only the latest cue, not a burst');
  const before = p.total; p.extend(15); assert.equal(p.total, before + 15);
  p.seekTo(p.total - 2); t += 3000; p.tick(); assert.equal(p.done, true);
  assert.ok(p.completedIds().length > 0); p.destroy();
});
test('locate() finds the right segment', () => {
  const tl = session(20);
  for (const s of tl.segments) assert.equal(locate(tl, s.start + s.sec / 2).seg, s);
});
