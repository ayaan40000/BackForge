// Coach voice. Two engines:
//  1. Natural (default when available): a pre-recorded neural voice pack
//     (Kokoro-82M, rendered by tools/render_voice.py into app/voice/<voice>/),
//     played sentence by sentence through Web Audio. Works offline once cached,
//     sounds human, and its real clip lengths drive the coach's timing.
//  2. Device voice: Web Speech API (speechSynthesis), the most natural voice the
//     device offers. Used when the pack is off, or for a safety/brief sentence the
//     pack doesn't cover. Captions always show every line, so muted works too.
import { duck, decode, playChain, ensureAudio } from './audio.js';
import { splitSentences } from './sentences.js';

export const PACKS = [{ id: 'af_heart', label: 'Natural — Heart (warm, clear)' }, { id: 'am_michael', label: 'Natural — Michael (deeper)' }];
const PREFERRED = [/natural/i, /neural/i, /premium/i, /enhanced/i, /Google UK English Female/i, /Google US English/i, /Samantha/i, /Daniel/i, /Serena/i, /Karen/i, /Moira/i, /Aria/i, /Jenny/i, /Guy/i];
let voice = null, enabled = true, rate = 1.04, volume = 1, listeners = new Set();
let pack = null, packBase = '', buffers = new Map(), current = null, pron = null;
const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;

export function voices() { return (synth()?.getVoices() || []).filter(v => /^en/i.test(v.lang)); }
export function pickVoice(name) {
  const list = voices();
  if (name) voice = list.find(v => v.name === name) || voice;
  if (!voice) for (const re of PREFERRED) { voice = list.find(v => re.test(v.name)); if (voice) break; }
  if (!voice) voice = list.find(v => v.localService) || list[0] || null;
  return voice;
}
if (synth()) synth().addEventListener?.('voiceschanged', () => { if (!voice) pickVoice(); });

/** Load a voice pack manifest ({sentences: {text: [file, seconds]}}). Returns false if absent. */
export async function loadPack(id, base) {
  if (!id || id === 'device') { pack = null; return false; }
  if (pack?.voice === id) return true;
  try {
    const r = await fetch(`${base}app/voice/${id}/manifest.json`); if (!r.ok) throw 0;
    pack = await r.json(); pack.voice = id; packBase = `${base}app/voice/${id}/`; buffers = new Map(); return true;
  } catch { pack = null; return false; }
}
export async function loadPronunciation(base) { try { pron = (await (await fetch(base + 'data/voice-pronounce.json')).json()).map; } catch { pron = null; } }
const pronounce = t => { if (!pron) return t; for (const k of Object.keys(pron).sort((a, b) => b.length - a.length)) t = t.split(k).join(pron[k]); return t; };

export const packActive = () => !!pack && enabled;
/** Is every sentence of this line recorded? */
export const covers = text => !!pack && splitSentences(text).every(s => pack.sentences[s]);
/** Real spoken length of a fully recorded line (seconds), else null. */
export function durationOf(text) {
  if (!pack) return null; let t = 0;
  for (const s of splitSentences(text)) { const e = pack.sentences[s]; if (!e) return null; t += e[1] + 0.12; }
  return t / (rate / 1.04);
}
async function bufferFor(sentence) {
  const e = pack?.sentences[sentence]; if (!e) return null;
  if (!buffers.has(e[0])) buffers.set(e[0], fetch(packBase + e[0]).then(r => r.arrayBuffer()).then(decode).catch(() => null));
  return buffers.get(e[0]);
}
/** Warm the cache for a whole session (called at start with the transcript). */
export function prefetch(texts) { if (!pack) return; for (const t of texts) for (const s of splitSentences(t)) bufferFor(s); }

export const voiceState = () => ({ enabled, rate, volume, name: voice?.name || null, supported: !!synth(), pack: pack?.voice || null });
export function configureVoice(o = {}) {
  if ('enabled' in o) { enabled = !!o.enabled; if (!enabled) stop(); }
  if (o.rate) rate = o.rate; if (o.volume != null) volume = o.volume; if (o.name) pickVoice(o.name);
}
export function onSpeak(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function speakDevice(text, pri) {
  const s = synth(); if (!s) return;
  if (pri >= 3 || s.speaking) s.cancel();
  const u = new SpeechSynthesisUtterance(pronounce(text));
  u.voice = voice || pickVoice(); u.rate = rate; u.volume = volume; u.pitch = 1;
  u.onstart = () => duck(true); u.onend = u.onerror = () => duck(false);
  s.speak(u);
}
/**
 * Speak one line. pri ≥ 3 interrupts. With a pack: recorded clips; a line the
 * pack doesn't fully cover uses the device voice only if it matters (safety,
 * brief, switch: pri ≥ 3) — otherwise the caption carries it, so the voice never
 * flips between two speakers for small talk.
 */
export async function speak(text, { pri = 2 } = {}) {
  listeners.forEach(f => f(text));
  if (!enabled || !text) return;
  if (pack) {
    if (covers(text)) {
      if (pri >= 3 || current) { current?.stop(); synth()?.cancel(); }
      const bufs = (await Promise.all(splitSentences(text).map(bufferFor))).filter(Boolean);
      current = playChain(bufs, { rate: rate / 1.04, onstart: () => duck(true), onend: () => { duck(false); current = null; } });
      return;
    }
    if (pri < 3) return;
  }
  speakDevice(text, pri);
}
export function stop() { current?.stop(); current = null; synth()?.cancel(); duck(false); }
export function pauseVoice() { synth()?.pause(); }
export function resumeVoice() { synth()?.resume(); }
