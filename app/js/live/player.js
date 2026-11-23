// The real-time player: a drift-free clock over the compiled timeline.
// Time is wall-clock based (performance.now), so a throttled tab, a phone call
// or a locked screen never makes the session drift — it catches up and fires
// only the most recent cue instead of a burst.
import { locate, reflow } from './compiler.js';

export class LivePlayer extends EventTarget {
  constructor(timeline, { onCue, onBeep, now = () => performance.now() } = {}) {
    super();
    this.tl = timeline; this.now = now; this.onCue = onCue || (() => {}); this.onBeep = onBeep || (() => {});
    this.elapsed = 0; this.running = false; this._t0 = 0; this._fired = new Set(); this._raf = 0; this._iv = 0;
    this.skipped = new Set(); this.regressed = new Set(); this.done = false;
  }
  get total() { return this.tl.totalSec; }
  get position() { return locate(this.tl, Math.min(this.elapsed, this.total - 0.001)); }

  start() { if (this.running || this.done) return; this.running = true; this._t0 = this.now() - this.elapsed * 1000; this._loop(); this._emit('state'); }
  pause() { if (!this.running) return; this.tick(); this.running = false; cancelAnimationFrame?.(this._raf); clearInterval(this._iv); this._emit('state'); }
  toggle() { this.running ? this.pause() : this.start(); }

  _loop() {
    clearInterval(this._iv);
    // rAF for smooth UI when visible; a 250 ms interval keeps cues firing when hidden
    const frame = () => { if (!this.running) return; this.tick(); this._raf = requestAnimationFrame(frame); };
    if (typeof requestAnimationFrame === 'function') this._raf = requestAnimationFrame(frame);
    this._iv = setInterval(() => this.running && this.tick(), 250);
  }

  tick() {
    if (!this.running) return;
    const prev = this.elapsed;
    this.elapsed = Math.min(this.total, (this.now() - this._t0) / 1000);
    this._fire(prev, this.elapsed);
    this._emit('tick');
    if (this.elapsed >= this.total) { this.running = false; this.done = true; clearInterval(this._iv); this._emit('done'); }
  }

  /** Fire cues whose time fell inside (prev, now]. After a long gap, only the latest of each kind fires. */
  _fire(prev, now) {
    const gap = now - prev > 1.5;
    let lastLine = null, lastBeep = null;
    for (const s of this.tl.segments) {
      if (s.start > now) break;
      if (s.start + s.sec < prev - 0.01) continue;
      for (const l of s.lines || []) {
        const t = s.start + l.at, key = `l${s.i}:${l.at}`;
        if (t > prev - 0.001 && t <= now && !this._fired.has(key)) { this._fired.add(key); lastLine = gap ? l : (this.onCue(l, s), null); }
      }
      for (const b of s.beeps || []) {
        const t = s.start + b.at, key = `b${s.i}:${b.at}`;
        if (t > prev - 0.001 && t <= now && !this._fired.has(key)) { this._fired.add(key); lastBeep = gap ? b : (this.onBeep(b, s), null); }
      }
    }
    if (lastLine) this.onCue(lastLine, null);
    if (lastBeep && now - prev < 4) this.onBeep(lastBeep, null);
  }

  seekTo(sec) {
    this.elapsed = Math.max(0, Math.min(this.total - 0.01, sec));
    this._t0 = this.now() - this.elapsed * 1000;
    // don't replay anything before the new point; allow everything after
    this._fired = new Set([...this._fired].filter(k => { const [seg, at] = k.slice(1).split(':'); const s = this.tl.segments[+seg]; return s && s.start + +at <= this.elapsed; }));
    this._emit('tick');
  }
  /** Jump to the start of the next segment (skip a rest, or skip the rest of a set). */
  next() { const p = this.position; const n = this.tl.segments[p.index + 1]; if (n) this.seekTo(n.start + 0.001); }
  /** Back to the start of this segment, or the previous one if we're < 2 s in. */
  back() { const p = this.position; const target = p.into < 2 && p.index > 0 ? this.tl.segments[p.index - 1] : p.seg; this.seekTo(target.start + 0.001); }
  /** Skip the whole current exercise (guilt-free: skip = no data). */
  skipExercise() {
    const p = this.position; const ex = p.seg.exIndex; if (ex == null) return this.next();
    this.skipped.add(p.seg.exId);
    const n = this.tl.segments.find(s => s.i > p.index && s.exIndex != null && s.exIndex > ex && s.type === 'prep') || this.tl.segments.at(-1);
    this.seekTo(n.start + 0.001);
  }
  /** Add seconds to the current segment (e.g. +15 s rest). */
  extend(sec = 15) {
    const p = this.position; p.seg.sec += sec;
    reflow(this.tl); this._t0 = this.now() - this.elapsed * 1000;
    // cues anchored to the end (countdown) move with it
    for (const b of p.seg.beeps || []) if (b.at > p.into) b.at += sec;
    for (const l of p.seg.lines || []) if (l.at > p.into) l.at += sec;
    this._emit('tick');
  }
  /** Mark the current exercise as regressed (the UI shows the regression text). */
  regress() { const s = this.position.seg; if (s.exId) this.regressed.add(s.exId); this._emit('state'); return s; }
  completedIds() {
    const ids = new Set();
    for (const s of this.tl.segments) if (s.type === 'work' && s.start + s.sec * 0.5 <= this.elapsed && !this.skipped.has(s.exId)) ids.add(s.exId);
    return [...ids];
  }
  destroy() { this.running = false; clearInterval(this._iv); cancelAnimationFrame?.(this._raf); }
  _emit(type) { this.dispatchEvent(new Event(type)); }
}
