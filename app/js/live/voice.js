// Coach voice: Web Speech API (speechSynthesis), on-device, free, offline on
// most phones. Picks the most natural English voice available; captions are
// always shown on screen so the session works muted too.
import { duck } from './audio.js';

const PREFERRED = [/natural/i, /neural/i, /premium/i, /enhanced/i, /Google UK English Female/i, /Google US English/i, /Samantha/i, /Daniel/i, /Serena/i, /Karen/i, /Moira/i, /Aria/i, /Jenny/i, /Guy/i];
let voice = null, enabled = true, rate = 1.04, volume = 1, listeners = new Set();
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

export const voiceState = () => ({ enabled, rate, volume, name: voice?.name || null, supported: !!synth() });
export function configureVoice(o = {}) {
  if ('enabled' in o) { enabled = !!o.enabled; if (!enabled) stop(); }
  if (o.rate) rate = o.rate; if (o.volume != null) volume = o.volume; if (o.name) pickVoice(o.name);
}
export function onSpeak(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Speak one line. pri ≥ 3 interrupts whatever is playing. */
export function speak(text, { pri = 2 } = {}) {
  listeners.forEach(f => f(text));
  const s = synth(); if (!s || !enabled || !text) return;
  if (pri >= 3 || s.speaking) s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice || pickVoice(); u.rate = rate; u.volume = volume; u.pitch = 1;
  u.onstart = () => duck(true); u.onend = u.onerror = () => duck(false);
  s.speak(u);
}
export function stop() { synth()?.cancel(); duck(false); }
export function pauseVoice() { synth()?.pause(); }
export function resumeVoice() { synth()?.resume(); }
