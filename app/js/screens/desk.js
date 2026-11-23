// Desk: combat what sitting and slouching do — problems + quick fixes, ready-made
// micro-breaks the coach runs, an ergonomics checklist, and work-hours reminders.
import { html, useState, useEffect } from '../../vendor/htm-preact.mjs';
import { HelpFor } from './learn.js';
import { Icon, glyphFor } from '../ui/icons.js';
import { Demo, hasDemo } from '../ui/demo.js';
import { state, update } from '../store.js';
import { lib, deskDoc, photosFor, ctx } from '../data.js';
import { deskPrefs, inWorkHours, nextDueAt, nextBreak, icsFor, onDesk, fire, doneBreak, snooze, dueBreak } from '../desk.js';
import { available } from '../engine/kit.js';
import { go } from '../router.js';

const startBreak = (ids, title) => go(`/live/play?variant=custom&mins=2&energy=ok&ids=${ids.join(',')}&title=${encodeURIComponent(title)}`);

export function Desk() {
  const D = deskDoc(), S = state(), p = deskPrefs(), [, force] = useState(0);
  useEffect(() => { const off = onDesk(() => force(x => x + 1)); const t = setInterval(() => force(x => x + 1), 30000); return () => { off(); clearInterval(t); }; }, []);
  if (!D) return html`<div class="empty">Desk content is loading…</div>`;
  const set = patch => update(x => { x.desk = { ...deskPrefs(), ...(x.desk || {}), ...patch }; });
  const ergo = S.desk?.ergo || [];
  const kit = ctx().kit, usable = ids => ids.filter(id => lib().get(id) && lib().safeGet(id, ctx().flags) && available(lib().get(id), kit));
  const nextIn = Math.max(0, Math.round((nextDueAt(p) - Date.now()) / 60000));
  const done = (S.desk?.doneToday || []).filter(t => new Date(t).toDateString() === new Date().toDateString()).length;
  const ics = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icsFor(p)], { type: 'text/calendar' })); a.download = 'backforge-desk-breaks.ics'; a.click(); };
  const askNotify = async () => { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); force(x => x + 1); };
  const nb = nextBreak();
  return html`<header class="screen-head"><div><div class="sub">Sitting and slouching, handled</div><h1>Desk</h1></div><${HelpFor} screen="desk" /></header>
  <div class="grid-2"><div class="col">
    <section class="card glass"><div class="row between"><div><div class="kicker">Break reminders</div><div class="headline">${p.on ? (inWorkHours(p) ? `Next break in ${nextIn} min` : 'Outside your work hours') : 'Off'}</div></div>
      <input type="checkbox" class="toggle" aria-label="Desk reminders" checked=${p.on} onChange=${e => { set({ on: e.target.checked, lastAt: Date.now() }); if (e.target.checked) askNotify(); }} /></div>
      <p class="caption mt-2">${done} break${done === 1 ? '' : 's'} today. Reminders appear while BackForge is open in any tab; add them to your calendar to get them with the app closed.</p>
      <div class="grid-2 mt-3" style="gap:10px">
        <label><span class="caption">Start</span><input type="time" value=${p.start} onChange=${e => set({ start: e.target.value })} /></label>
        <label><span class="caption">End</span><input type="time" value=${p.end} onChange=${e => set({ end: e.target.value })} /></label></div>
      <div class="chips mt-3" role="radiogroup" aria-label="Every">${[30, 45, 60, 90].map(m => html`<button class="chip sm" role="radio" aria-checked=${p.every === m} onClick=${() => set({ every: m })}>every ${m} min</button>`)}</div>
      <div class="chips mt-2" role="group" aria-label="Days">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => html`<button class="chip sm" aria-pressed=${p.days.includes(i)} aria-label=${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]} onClick=${() => set({ days: p.days.includes(i) ? p.days.filter(x => x !== i) : [...p.days, i].sort() })}>${d}</button>`)}</div>
      <div class="row wrap mt-3"><button class="btn ghost" onClick=${ics}><${Icon} n="calendar" s=${18} /> Add to calendar (.ics)</button>
        ${'Notification' in window && Notification.permission !== 'granted' && html`<button class="btn text" onClick=${askNotify}>Allow notifications</button>`}
        <button class="btn text" onClick=${fire}>Test a reminder</button></div>
      ${nb && html`<p class="caption mt-2">Next up: <b>${nb.title}</b></p>`}</section>
    <section class="card glass"><div class="kicker mb-3">Quick breaks · 1–2 minutes, voice-coached</div>
      <div class="list">${D.microBreaks.map(b => { const ids = usable(b.ids); return html`<button onClick=${() => startBreak(ids, b.title)} disabled=${!ids.length}>
        <span class="glyph" style="color:var(--c-accent)"><${Icon} n="play" fill s=${18} /></span><span class="grow"><span class="t">${b.title}</span><br/><span class="d">${b.when} · ${ids.map(id => lib().get(id).name).join(', ')}</span></span></button>`; })}</div></section>
    <section class="card glass"><div class="row between"><div class="kicker">Desk setup checklist</div><span class="caption">${ergo.length}/${D.ergonomics.length}</span></div>
      <div class="list mt-3">${D.ergonomics.map((t, i) => html`<button role="checkbox" aria-checked=${ergo.includes(i)} onClick=${() => set({ ergo: ergo.includes(i) ? ergo.filter(x => x !== i) : [...ergo, i] })}>
        <span class="glyph" style=${ergo.includes(i) ? 'background:var(--c-accent);color:var(--c-on-accent)' : ''}><${Icon} n=${ergo.includes(i) ? 'check' : 'plus'} s=${18} /></span><span class="grow t" style="font-size:14px">${t}</span></button>`)}</div></section>
  </div><div class="col">
    ${D.problems.map(pr => { const ids = usable(pr.moves); return html`<section class="card glass">
      <div class="kicker">Every ${pr.everyMinutes} min · ${pr.seconds} s</div><div class="headline mt-1">${pr.title}</div>
      <p class="callout mt-2">${pr.why}</p>
      <details class="more mt-2"><summary>Signs it's you</summary><ul class="callout" style="padding-left:18px">${pr.signs.map(s => html`<li>${s}</li>`)}</ul></details>
      <div class="row wrap mt-3" style="gap:8px">${ids.map(id => html`<a class="chip sm" href=${`#/moves/${id}`}>${hasDemo(id) ? html`<${Demo} id=${id} size="sm" />` : html`<${Icon} n=${glyphFor(lib().get(id))} s=${16} />`}${lib().get(id).name}</a>`)}</div>
      <button class="btn primary mt-3" disabled=${!ids.length} onClick=${() => startBreak(ids.slice(0, 3), pr.title)}><${Icon} n="play" fill s=${18} /> Do it now · ${Math.round(pr.seconds / 60 * 10) / 10 || 1} min</button></section>`; })}
  </div></div>`;
}

/** Floating card when a break is due (shown on every screen except the player). */
export function DeskBreakCard() {
  const [, force] = useState(0);
  useEffect(() => onDesk(() => force(x => x + 1)), []);
  const b = dueBreak(); if (!b) return null;
  const ids = b.ids.filter(id => lib().get(id) && lib().safeGet(id, ctx().flags));
  return html`<div class="desk-due glass-thick" role="alertdialog" aria-label="Desk break">
    <div class="kicker" style="color:var(--c-accent)">Desk break</div><div class="headline">${b.title}</div><p class="caption">${b.when}</p>
    <div class="row wrap mt-3" style="gap:8px"><button class="btn primary" onClick=${() => { doneBreak(); startBreak(ids, b.title); }}><${Icon} n="play" fill s=${18} /> Start</button>
      <button class="btn ghost" onClick=${() => snooze(10)}>In 10 min</button><button class="btn text" onClick=${() => doneBreak(true)}>Skip</button></div></div>`;
}
