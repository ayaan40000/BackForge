// Web Audio cue sounds + an optional generative ambient bed. Everything is
// synthesised — no audio files to ship or license. The graph is routed into a
// MediaStream <audio> element too, so phones treat the session as media
// (lock-screen controls via Media Session, keeps playing with the screen dim).
let ctx, master, cueBus, bedBus, voiceBus, bedNodes = null, mediaEl = null;

// ---- unlocking (phones) ----
// iPhone Safari only lets audio start inside a tap, and mutes Web Audio with the
// ring/silent switch unless the page is playing media. unlockAudio() is called on
// every tap until sound is running: it resumes the context, plays a silent
// sample, starts a looping silent <audio> (puts iOS in "playback" mode), declares
// navigator.audioSession = 'playback' where supported, and warms up speech.
let silentEl = null;
function silentWavUrl() {
  const n = 2400, buf = new ArrayBuffer(44 + n), v = new DataView(buf), w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
export function unlockAudio() {
  const c = ensureAudio(); if (!c) return false;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  if (c.state !== 'running') c.resume().catch(() => {});
  try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
  try { if (!silentEl) { silentEl = new Audio(silentWavUrl()); silentEl.loop = true; silentEl.setAttribute('playsinline', ''); } if (silentEl.paused) silentEl.play().catch(() => {}); } catch {}
  try { if (window.speechSynthesis && !unlockAudio.spoke) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); unlockAudio.spoke = true; } } catch {}
  return c.state === 'running';
}
export const audioReady = () => !!ctx && ctx.state === 'running';
const stateSubs = new Set();
/** Called when sound starts, gets blocked, or is interrupted (iPhone: calls, screen lock). */
export const onAudioState = f => (stateSubs.add(f), () => stateSubs.delete(f));

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  ctx.onstatechange = () => stateSubs.forEach(f => f(ctx.state));
  master = ctx.createGain(); master.gain.value = 0.9;
  cueBus = ctx.createGain(); cueBus.gain.value = 0.8;
  bedBus = ctx.createGain(); bedBus.gain.value = 0;
  voiceBus = ctx.createGain(); voiceBus.gain.value = 1;
  cueBus.connect(master); bedBus.connect(master); voiceBus.connect(master);
  master.connect(ctx.destination);
  try {
    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    mediaEl = new Audio(); mediaEl.srcObject = dest.stream; mediaEl.muted = true; // muted: the speakers already get ctx.destination
    mediaEl.play().catch(() => {});
  } catch { /* older browsers: fine without */ }
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.35, to = null, bus = cueBus } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(bus); o.start(start); o.stop(start + dur + 0.05);
}

/** tick (3-2-1), go, end, half, rest, finish */
export function cue(kind) {
  if (!ensureAudio()) return;
  const t = ctx.currentTime + 0.01;
  switch (kind) {
    case 'tick': tone(880, t, 0.12, { type: 'triangle', gain: 0.3 }); break;
    case 'go': tone(660, t, 0.14, { type: 'triangle', gain: 0.32 }); tone(1320, t + 0.11, 0.32, { type: 'triangle', gain: 0.34 }); break;
    case 'end': tone(1046, t, 0.12, { gain: 0.25 }); tone(784, t + 0.1, 0.3, { gain: 0.25 }); break;
    case 'half': tone(1568, t, 0.5, { gain: 0.14 }); tone(2093, t + 0.02, 0.6, { gain: 0.06 }); break;
    case 'rep': tone(520, t, 0.06, { type: 'square', gain: 0.05 }); break;
    case 'finish': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.6, { type: 'triangle', gain: 0.22 })); break;
  }
}

export function setCueVolume(v) { if (ensureAudio()) cueBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }

/* Ambient bed: slow evolving pad (two detuned voices per chord tone through a
   low-pass), chord changes every 8 s. Very quiet; ducks under the coach voice. */
const CHORDS = [[220, 277.18, 329.63], [196, 246.94, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
let bedLevel = 0.06, bedTimer = null;
export function startBed(level = bedLevel) {
  if (!ensureAudio() || bedNodes) return;
  bedLevel = level;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4; lp.connect(bedBus);
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 350; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  const voices = [];
  for (let i = 0; i < 6; i++) { const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; const g = ctx.createGain(); g.gain.value = i % 2 ? 0.05 : 0.16; o.connect(g); g.connect(lp); o.start(); voices.push(o); }
  let k = 0;
  const step = () => { const ch = CHORDS[k++ % CHORDS.length]; voices.forEach((o, i) => o.frequency.setTargetAtTime(ch[i % 3] * (i % 2 ? 1.004 : 0.5), ctx.currentTime, 1.8)); };
  step(); bedTimer = setInterval(step, 8000);
  bedNodes = { voices, lfo, lp };
  bedBus.gain.setTargetAtTime(bedLevel, ctx.currentTime, 1.5);
}
export function stopBed() {
  if (!bedNodes) return;
  bedBus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  const n = bedNodes; bedNodes = null; clearInterval(bedTimer);
  setTimeout(() => { n.voices.forEach(o => o.stop()); n.lfo.stop(); }, 1500);
}
/** Lower the bed while the coach talks. */
export function duck(on) { if (ctx && bedNodes) bedBus.gain.setTargetAtTime(on ? bedLevel * 0.35 : bedLevel, ctx.currentTime, on ? 0.08 : 0.6); }
export const bedOn = () => !!bedNodes;

// ---- recorded voice (neural voice pack) ----
export const audioCtx = () => ensureAudio();
export async function decode(arrayBuf) { const c = ensureAudio(); return c.decodeAudioData(arrayBuf); }
/** Play buffers back to back; returns a handle with stop(). */
export function playChain(buffers, { onstart, onend, rate = 1 } = {}) {
  const c = ensureAudio(); let t = c.currentTime + 0.03; const srcs = [];
  for (const b of buffers) { const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(voiceBus); s.start(t); srcs.push(s); t += b.duration / rate + 0.12; }
  onstart?.(); let done = false;
  const finish = () => { if (!done) { done = true; onend?.(); } };
  if (srcs.length) srcs[srcs.length - 1].onended = finish; else finish();
  return { stop() { for (const s of srcs) try { s.stop(); } catch {} finish(); }, endsAt: t };
}
export function setVoiceVolume(v) { if (ensureAudio() && voiceBus) voiceBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); }
