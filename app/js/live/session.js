// One Live session at a time: builds → compiles → scripts → runs the timeline and
// wires it to voice, sound, haptics, lock-screen controls (Media Session), wake
// lock and resume-after-interruption. Screens only read `snapshot()` and call actions.
import { buildLive } from '../engine/live.js';
import { readiness } from '../engine/progress.js';
import { compile } from './compiler.js';
import { scriptSession, makePicker } from './coach.js';
import { LivePlayer } from './player.js';
import { cue, ensureAudio, startBed, stopBed, setCueVolume, unlockAudio, audioReady, onAudioState } from './audio.js';
import { speak, stop as stopVoice, configureVoice, pickVoice, packActive, covers as packCovers, durationOf, prefetch } from './voice.js';
import { transcript } from './coach.js';
import { lib, voiceLines, ctx } from '../data.js';
import { state, update, uiPrefs, logSession } from '../store.js';
import { dayStr } from '../engine/dates.js';
import { formMode, patternGrades, MENU } from '../engine/corrective.js';

let run = null;               // { opts, workout, tl, player, caption, captionAt, ... }
const subs = new Set();
const emit = () => subs.forEach(f => f());
export const onSession = f => (subs.add(f), () => subs.delete(f));
export const active = () => run;

function weakSide(c) { const t = c.findings.map(f => f.t).join(' '); return /Right (glute|hip)/.test(t) ? 'right' : /Left (glute|hip)/.test(t) ? 'left' : ''; }

/** Pure preview: build + compile + script. Used by Live setup (recompiles on every change). */
export function prepare(opts) {
  const c = ctx(); const S = state();
  const workout = buildLive(lib(), c, { ...opts, S });
  const ws = weakSide(c);
  const r = readiness(c), ck = c.todaysCheckin();
  const script = target => scriptSession(compile(lib(), workout, { targetMin: target, firstSide: ws || undefined }), voiceLines(), { name: (S.profile?.displayName || S.profile?.name || '').split(' ')[0], mins: opts.mins, readiness: r?.level, pain: ck?.pain, sleep: ck?.sleep, weakSide: ws, chattiness: uiPrefs().chattiness || 'standard', seed: hash(dayStr() + opts.mins), ...(packActive() ? { covers: packCovers, durationOf, name: (S.profile?.displayName || S.profile?.name || '').split(' ')[0] === 'Ayaan' ? 'Ayaan' : '' } : {}) });
  // briefings may lengthen a prep; re-fit once so the clock reads the chosen time
  let tl = script(opts.mins);
  const over = tl.totalSec - opts.mins * 60;
  if (Math.abs(over) > 15) tl = script(opts.mins - over / 60);
  return { workout, tl };
}
const hash = s => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function start(opts, { resumeAt = 0 } = {}) {
  if (run) end(false);
  const { workout, tl } = prepare(opts);
  const prefs = uiPrefs();
  unlockAudio(); setCueVolume(prefs.cueVolume ?? 0.8);
  configureVoice({ enabled: prefs.voice !== false, rate: prefs.rate || 1.04, name: prefs.voiceName || undefined }); pickVoice(prefs.voiceName);
  if (prefs.bed) startBed();
  // iOS needs a speech call inside the user gesture to unlock the synth
  try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; speechSynthesis.speak(u); } catch {}
  const player = new LivePlayer(tl, {
    onCue: (l) => { run.caption = l.text; run.captionAt = performance.now(); speak(l.text, { pri: l.pri >= 6 ? 3 : 2 }); emit(); },
    onBeep: (b) => { cue(b.tone); if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(b.tone === 'go' ? 40 : b.tone === 'rest' ? [20, 60, 20] : b.tone === 'finish' ? [30, 50, 30, 50, 120] : 0); },
  });
  prefetch(transcript(tl).map(l => l.text));
  run = { opts, workout, tl, player, caption: '', lastSeg: -1, pain: [], startedAt: Date.now(), preTimeline: tl.totalSec, pick: makePicker(voiceLines(), 99) };
  player.addEventListener('tick', onTick);
  player.addEventListener('state', emit);
  player.addEventListener('done', () => { releaseWake(); persist(); emit(); });
  if (resumeAt) player.seekTo(resumeAt);
  player.start();
  acquireWake(); media(); persist();
  emit();
  return run;
}

function onTick() {
  const p = run.player.position;
  if (p.index !== run.lastSeg) { run.lastSeg = p.index; persist(); media(); }
  emit();
}

export function snapshot() {
  if (!run) return null;
  const pl = run.player, pos = pl.position, seg = pos.seg;
  const next = run.tl.segments.slice(pos.index + 1).find(s => s.type === 'work' && (s.exId !== seg.exId || s.set !== seg.set || s.side !== seg.side));
  return {
    seg, pos, elapsed: pl.elapsed, total: pl.total, left: pl.total - pl.elapsed, running: pl.running, done: pl.done,
    caption: run.caption, next, tl: run.tl, workout: run.workout, regressed: pl.regressed.has(seg.exId), opts: run.opts,
  };
}

const say = (key, vars = {}, pri = 2) => { const t = run.pick(key, vars, run.player.elapsed); if (t) { run.caption = t; speak(t, { pri }); } };
export { audioReady };
onAudioState(() => emit());
/** The player's "Tap for sound" button: unlock inside the tap, then repeat the current line. */
export function enableSound() { unlockAudio(); setTimeout(() => { if (run?.caption) speak(run.caption, { pri: 3 }); emit(); }, 250); }
export function toggle() {
  if (!run) return;
  unlockAudio();
  const was = run.player.running;
  run.player.toggle();
  if (was) { stopVoice(); say('pause', {}, 3); releaseWake(); }
  else { const s = run.player.position.seg; say('resume', { ex: s.name || '', side: s.side || '', set: s.set || '', setupCue: s.setupCue || '' }, 3); acquireWake(); }
  persist(); emit();
}
export function next() { run?.player.next(); stopVoice(); emit(); }
export function back() { run?.player.back(); stopVoice(); emit(); }
export function extend() { if (!run) return; const t = run.player.position.seg.type; if (t === 'rest' || t === 'prep' || t === 'switch') { run.player.extend(15); emit(); } }
export function easier() {
  if (!run) return;
  const s = run.player.regress();
  if (s.exId) { say('regress_ack', { regression: (s.regression || 'the smaller range').replace(/\.$/, '').toLowerCase() }, 3); persist(); }
  emit();
}
/** Rate form for an exercise just done (shown in the rest after its last set). r: clean | shaky | hard */
export function rateForm(exId, r) {
  if (!run || !exId) return;
  run.rated = run.rated || {}; run.rated[exId] = r;
  update(S => {
    S.posture = S.posture || {};
    S.posture.formLog = [...(S.posture.formLog || []), { date: dayStr(), id: exId, r }].slice(-400);
    // track the move's mode; a change resets the counting window (physio review §5)
    const st = S.posture.formState || {};
    const grades = patternGrades(S).grades;
    const priority = Object.entries(MENU).some(([k, m]) => grades[k] === 'Priority' && Object.values(m).some(a => Array.isArray(a) && a.includes(exId)));
    const mode = formMode(exId, { formLog: S.posture.formLog, state: st, checkins: S.checkins, log: S.log, priority, today: dayStr() });
    if (mode !== (st[exId]?.mode ?? null)) S.posture.formState = { ...st, [exId]: { mode, changedAt: dayStr() } };
  });
  emit();
}
export const ratedFor = exId => run?.rated?.[exId] || null;
/** kind: 'sharp' | 'achy' | 'redflag' */
export function painReport(kind) {
  if (!run) return;
  const s = run.player.position.seg;
  run.pain.push({ kind, ex: s.exId, at: Math.round(run.player.elapsed) });
  if (kind === 'sharp') { stopVoice(); say('pain_stop', { regression: (s.regression || '').replace(/\.$/, '').toLowerCase() }, 3); run.player.skipExercise(); run.player.start(); }
  else if (kind === 'redflag') { run.player.pause(); stopVoice(); }
  else { run.player.start(); }
  emit();
}
export function toggleVoice() { const on = !(uiPrefs().voice !== false); import('../store.js').then(m => m.setUi({ voice: on })); configureVoice({ enabled: on }); emit(); }
export function toggleBed() { const on = !uiPrefs().bed; import('../store.js').then(m => m.setUi({ bed: on })); on ? startBed() : stopBed(); emit(); }

/** Finish + log. pain = 0..10 or null (skipping is allowed, never defaulted). */
export function finish({ pain = null, leg = null } = {}) {
  if (!run) return null;
  const ids = run.player.completedIds();
  const mins = Math.max(1, Math.round(run.player.elapsed / 60));
  const kind = run.workout.kind === 'flare' ? 'flare' : run.workout.kind === 'posture' ? 'posture' : run.workout.kind === 'desk' ? 'micro' : 'live';
  logSession({ kind, title: run.workout.kind === 'flare' ? 'Relief session' : run.workout.kind === 'desk' ? `Desk break · ${run.workout.title}` : run.workout.kind === 'posture' ? `Posture session · ${run.opts.mins} min` : `Live workout · ${run.opts.mins} min`, pain, mins, exerciseIds: ids });
  update(S => { S.livePrefs = { ...(S.livePrefs || {}), mins: run.opts.mins, energy: run.opts.energy, caveats: run.opts.caveats }; if (leg != null) S.log[S.log.length - 1].leg = leg; if (run.pain.length) S.log[S.log.length - 1].painEvents = run.pain; S.liveRun = null; });
  const summary = { mins, moves: ids.length, regressions: run.player.regressed.size, ids };
  end(false);
  return summary;
}
export function end(clear = true) {
  if (!run) return;
  run.player.destroy(); stopVoice(); stopBed(); releaseWake();
  if (clear) update(S => { S.liveRun = null; });
  run = null; if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; emit();
}

// ---------- resume after interruption (persisted at every segment boundary) ----------
function persist() { if (!run) return; update(S => { S.liveRun = { date: dayStr(), opts: run.opts, elapsed: Math.round(run.player.elapsed), total: Math.round(run.player.total), at: Date.now(), exName: run.player.position.seg.name || null }; }); }
export function resumable() { const r = state().liveRun; return r && r.date === dayStr() && r.elapsed < r.total - 5 ? r : null; }

// ---------- wake lock + media session ----------
let wake = null;
async function acquireWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch {} }
function releaseWake() { try { wake?.release(); } catch {} wake = null; }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && run?.player.running) { acquireWake(); run.player.tick(); } });
function media() {
  if (!('mediaSession' in navigator) || !run) return;
  const s = run.player.position.seg;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: s.name || (s.type === 'intro' ? 'Getting started' : s.type === 'outro' ? 'Cool-down' : 'BackForge Live'), artist: s.set ? `Set ${s.set} of ${s.sets}${s.side ? ' · ' + s.side : ''}` : 'BackForge Live', album: run.workout.title });
    navigator.mediaSession.setActionHandler('play', () => run && !run.player.running && toggle());
    navigator.mediaSession.setActionHandler('pause', () => run && run.player.running && toggle());
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('previoustrack', back);
    navigator.mediaSession.setActionHandler('seekforward', extend);
  } catch {}
}
