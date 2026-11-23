// Moves: searchable library, filters, exercise detail sheet (the exact cues the coach speaks).
import { html, useState, useMemo } from '../../vendor/htm-preact.mjs';
import { HelpFor } from './learn.js';
import { Icon, glyphFor } from '../ui/icons.js';
import { Sheet } from '../ui/kit.js';
import { Demo, hasDemo } from '../ui/demo.js';
import { lib, ctx, photosFor, videosFor } from '../data.js';
import { exclusionReason, hasBand } from '../engine/library.js';
import { available } from '../engine/kit.js';
import { exerciseResponse } from '../engine/progress.js';
import { route, go } from '../router.js';
import { speak } from '../live/voice.js';
import { doseText } from '../live/coach.js';
import { prescribe } from '../engine/dose.js';
import { state } from '../store.js';

const FILTERS = [['all', 'All'], ['core', 'Core'], ['hip', 'Hips'], ['duck', 'Duck feet / hip IR'], ['glute', 'Glutes'], ['band', 'Bands'], ['doorway', 'Door anchor'], ['advanced', 'Advanced'], ['stretch', 'Stretches'], ['noband', 'No band'], ['mobility', 'Mobility'], ['desk', 'Desk'], ['gear', 'My equipment'], ['helps', 'Helps me']];

export function Moves() {
  const [q, setQ] = useState(''), [f, setF] = useState('all');
  const c = ctx(), resp = useMemo(() => exerciseResponse(c), [state().exLog.length]);
  const id = route().parts[1];
  const items = lib().all.filter(e => {
    if (q && !(e.name + ' ' + e.targets.join(' ')).toLowerCase().includes(q.toLowerCase())) return false;
    if (f === 'band') return hasBand(e); if (f === 'noband') return !hasBand(e);
    if (f === 'desk') return glyphFor(e) === 'desk' || (e.coach.contexts || []).includes('desk');
    if (f === 'helps') return resp[e.id]?.verdict === 'helps';
    if (f === 'duck') return (e.tags || []).some(t => t === 'duck-feet' || t === 'hip-ir') || /internal rotation|hip ir/i.test(e.name);
    if (f === 'doorway') return (e.equipment || []).includes('door-anchor') || (e.equipment || []).includes('doorway');
    if (f === 'advanced') return (e.level || 1) >= 3 || (e.tags || []).includes('advanced');
    if (f === 'stretch') return e.category === 'stretch' || (e.tags || []).includes('stretch');
    if (f === 'gear') return available(e, c.kit) && (e.equipment || []).some(x => !['none', 'mat', 'wall', 'chair', 'doorway', 'towel'].includes(x));
    if (f === 'mobility') return ['mobility', 'warmup', 'cooldown', 'relief'].includes(e.category);
    return f === 'all' || e.category === f;
  });
  const safe = items.filter(e => !exclusionReason(e, c.flags)), blocked = items.filter(e => exclusionReason(e, c.flags));
  const row = e => html`<a href=${`#/moves/${e.id}`} style=${blocked.includes(e) ? 'opacity:.5' : ''}>
    ${hasDemo(e.id) ? html`<${Demo} id=${e.id} size="sm" />` : html`<span class="glyph"><${Icon} n=${glyphFor(e)} s=${22} /></span>`}
    <span class="grow"><span class="t">${e.name}</span><br/><span class="d">${e.dose}${hasBand(e) ? ' · band' : ''}</span></span>
    ${resp[e.id]?.verdict === 'helps' && html`<span class="tag good">Helps</span>`}${resp[e.id]?.verdict === 'watch' && html`<span class="tag warn">Watch</span>`}
    <${Icon} n="chevron" s=${16} /></a>`;
  return html`
  <header class="screen-head"><div><div class="sub">${lib().all.length} exercises · band-first</div><h1>Moves</h1></div></header>
  <div class="glass-thin" style="position:sticky;top:8px;z-index:4;padding:10px;border-radius:var(--r-lg);margin-bottom:16px">
    <label class="row" style="gap:8px"><${Icon} n="search" /><input type="search" placeholder="Search moves or targets" value=${q} onInput=${e => setQ(e.target.value)} aria-label="Search moves" style="background:transparent;box-shadow:none;padding:0" /></label>
    <div class="chips mt-2" style="flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">${FILTERS.map(([k, l]) => html`<button class="chip sm" aria-pressed=${f === k} onClick=${() => setF(k)}>${l}</button>`)}</div>
  </div>
  ${f === 'all' && !q && html`<a class="card glass row between mb-4" href="#/moves/curlup"><span><span class="kicker">Start here</span><br/><span class="headline">McGill Big 3</span><br/><span class="callout">Curl-up, bird-dog, side plank — with video</span></span><${Icon} n="video" /></a>`}
  <div class="grid-2"><div class="list">${safe.slice(0, Math.ceil(safe.length / 2)).map(row)}</div><div class="list">${safe.slice(Math.ceil(safe.length / 2)).map(row)}</div></div>
  ${blocked.length > 0 && html`<h2 class="kicker mt-6 mb-3">Not in your plan (safety rules)</h2><div class="list">${blocked.map(row)}</div>`}
  <${Sheet} open=${!!id} onClose=${() => go('/moves')} label="Exercise detail">${id && html`<${Detail} id=${id} resp=${resp} />`}</${Sheet}>`;
}

function Detail({ id, resp }) {
  const e = lib().get(id); if (!e) return html`<p>Not found.</p>`;
  const c = ctx(), why = exclusionReason(e, c.flags), co = e.coach || {};
  const rx = prescribe(e.dose), dose = doseText({ ...rx, sides: rx.perSide ? ['right', 'left'] : [null], holdSec: rx.holdSec || rx.durationSec });
  const v = resp[e.id];
  return html`<div class="row" style="gap:14px"><span class="glyph" style="width:56px;height:56px"><${Icon} n=${glyphFor(e)} s=${28} /></span><div><div class="kicker">${e.category}</div><h2 class="title2">${e.name}</h2></div></div>
    <div class="mt-3"><${Demo} id=${id} label=${e.name} /></div>
    <p class="callout mt-2">${e.dose}${c.bandLevel[id] ? ` · band level ${c.bandLevel[id]}` : ''}${(e.equipment || []).filter(x => x !== 'none').length ? ` · needs ${e.equipment.filter(x => x !== 'none').join(', ').replace(/-/g, ' ')}` : ''}</p>
    ${why && html`<div class="banner" style="background:color-mix(in oklch,var(--c-attention) 14%,transparent)"><${Icon} n="lock" s=${18} /> Not served to you: ${why}.</div>`}
    ${co.helps && html`<p class="mt-3">${co.helps}</p>`}
    <div class="list mt-4">
      <div><span class="glyph"><${Icon} n="you" s=${20} /></span><span class="grow"><span class="d">Setup</span><br/><span class="t">${co.setupCue || e.cues[0]}</span></span></div>
      <div><span class="glyph"><${Icon} n="spark" s=${20} /></span><span class="grow"><span class="d">Focus</span><br/><span class="t">${co.focusCue || e.cues[1] || e.cues[0]}</span></span></div>
      ${co.gotIt && html`<div><span class="glyph" style="color:var(--c-good)"><${Icon} n="check" s=${20} /></span><span class="grow"><span class="d">You've got it when</span><br/><span class="t" style="font-weight:500">${co.gotIt}</span></span></div>`}
    </div>
    <details class="more mt-3"><summary>More cues & common mistakes</summary><ul class="callout" style="padding-left:18px">${e.cues.map(x => html`<li>${x}</li>`)}</ul><div class="kicker mt-3">Avoid</div><ul class="callout" style="padding-left:18px">${e.mistakes.map(x => html`<li>${x}</li>`)}</ul></details>
    <div class="grid-2 mt-3"><div class="card glass-thin" style="padding:14px"><div class="kicker">Easier</div><div class="callout">${e.regression || '—'}</div></div><div class="card glass-thin" style="padding:14px;margin:0"><div class="kicker">Harder</div><div class="callout">${e.progression || '—'}</div></div></div>
    ${v && v.verdict !== 'learning' && html`<p class="caption mt-3">Coach's read: ${v.verdict === 'helps' ? 'tends to precede pain drops for you' : v.verdict === 'watch' ? 'tends to precede pain rises for you — regress rather than force it' : 'neutral so far'} (${v.n} days logged).</p>`}
    ${co.muscles && html`<p class="caption mt-2">Works: ${co.muscles}</p>`}
    <div class="row wrap mt-4" style="gap:8px">
      <button class="btn ghost" onClick=${() => speak(`${e.name}. ${dose} ${co.setupCue || e.cues[0]}. Focus: ${co.focusCue || ''}.`, { pri: 3 })}><${Icon} n="voice" s=${18} /> Preview voice</button>
    </div>
    <div class="kicker mt-4 mb-2">Videos & demos</div>
    <div class="list">${videosFor(e).map(v => html`<a href=${v.url} target="_blank" rel="noopener"><span class="glyph" style=${v.direct ? 'color:var(--c-attention)' : ''}><${Icon} n="video" s=${18} /></span><span class="grow t" style="font-size:14px">${v.label}</span><span class="tag">${v.direct ? 'Video' : 'Search'}</span></a>`)}</div>
    ${e.source && html`<p class="caption mt-3">Evidence: ${e.source}</p>`}`;
}
