// Desk reminders: during work hours, every N minutes, nudge a 1–2 minute break.
// Fires while BackForge is open (any tab) — notification + chime + an in-app card.
// For reminders when the app is closed, export them to your calendar (.ics).
import { state, update } from './store.js';
import { deskDoc } from './data.js';
import { cue } from './live/audio.js';

export const DEFAULTS = { on: false, start: '09:00', end: '18:00', every: 45, days: [1, 2, 3, 4, 5], sound: true, notify: true };
export const deskPrefs = () => ({ ...DEFAULTS, ...(state().desk || {}) });
const mins = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export function inWorkHours(p = deskPrefs(), d = new Date()) { const n = d.getHours() * 60 + d.getMinutes(); return p.days.includes(d.getDay()) && n >= mins(p.start) && n < mins(p.end); }
/** Which break comes next: rotate through the micro-breaks. */
export function nextBreak(i = state().desk?.count || 0) { const mb = deskDoc()?.microBreaks || []; return mb.length ? mb[i % mb.length] : null; }
export function nextDueAt(p = deskPrefs()) { const last = state().desk?.lastAt || 0; return Math.max(last + p.every * 60000, Date.now() - 1); }

let timer = null, listeners = new Set(), due = null;
export const onDesk = f => (listeners.add(f), () => listeners.delete(f));
export const dueBreak = () => due;
const emit = () => listeners.forEach(f => f());
export function startDeskTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    const p = deskPrefs(); if (!p.on || due || !inWorkHours(p)) return;
    if (!state().desk?.lastAt) { update(x => { x.desk = { ...p, ...(x.desk || {}), lastAt: Date.now() }; }); return; }
    if (Date.now() >= nextDueAt(p)) fire();
  }, 20000);
}
export function fire() {
  const p = deskPrefs(), b = nextBreak(); if (!b) return;
  due = b; emit();
  if (p.sound) try { cue('half'); } catch {}
  if (p.notify && 'Notification' in window && Notification.permission === 'granted') try { new Notification('BackForge · time for a desk break', { body: `${b.title} — about ${b.seconds || 90} seconds. ${b.when || ''}`, tag: 'bf-desk', icon: 'app/icon-192.png' }); } catch {}
}
export function doneBreak(skipped = false) { update(x => { x.desk = { ...deskPrefs(), ...(x.desk || {}), lastAt: Date.now(), count: (x.desk?.count || 0) + 1, ...(skipped ? {} : { doneToday: [...((x.desk?.doneToday || []).filter(t => new Date(t).toDateString() === new Date().toDateString())), Date.now()] }) }; }); due = null; emit(); }
export function snooze(m = 10) { update(x => { const p = deskPrefs(); x.desk = { ...p, ...(x.desk || {}), lastAt: Date.now() - (p.every - m) * 60000 }; }); due = null; emit(); }

/** Calendar file: one recurring event per break slot, Mon–Fri (or the chosen days), within work hours. */
export function icsFor(p = deskPrefs(), appUrl = location.origin + location.pathname + '#/desk') {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], by = p.days.map(d => days[d]).join(',');
  const pad = n => String(n).padStart(2, '0'), today = new Date(); const ymd = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
  const mb = deskDoc()?.microBreaks || [];
  const ev = []; let i = 0;
  for (let t = mins(p.start) + p.every; t < mins(p.end); t += p.every, i++) {
    const b = mb[i % Math.max(1, mb.length)] || { title: 'Desk break', ids: [] };
    ev.push(['BEGIN:VEVENT', `UID:bf-desk-${t}-${ymd}@backforge`, `DTSTAMP:${ymd}T000000`, `DTSTART:${ymd}T${pad(Math.floor(t / 60))}${pad(t % 60)}00`, 'DURATION:PT2M', `RRULE:FREQ=WEEKLY;BYDAY=${by}`,
      `SUMMARY:BackForge: ${b.title}`, `DESCRIPTION:${(b.when || 'A 1–2 minute desk break').replace(/[,;]/g, ' ')} — open ${appUrl}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Desk break', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BackForge//Desk breaks//EN', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
}
