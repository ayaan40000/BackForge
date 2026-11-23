// You → Equipment on hand. Tick what you own; every plan then uses only what you can do —
// and works the special kit (kettlebell, foam roller, door anchor…) into sessions.
import { html } from '../../vendor/htm-preact.mjs';
import { Icon } from '../ui/icons.js';
import { state, update } from '../store.js';
import { lib } from '../data.js';
import { KIT, BAND_LEVELS, DEFAULT_KIT, kitOf, available } from '../engine/kit.js';

export function KitScreen({ embedded = false }) {
  const S = state(), kit = kitOf(S), levels = S.kit?.levels || {};
  const toggle = id => update(x => { const k = new Set(kitOf(x)); k.has(id) ? k.delete(id) : k.add(id); x.kit = { ...(x.kit || {}), items: [...k], updatedAt: new Date().toISOString() }; });
  const setLevel = (band, lv) => update(x => { const cur = new Set(x.kit?.levels?.[band] || []); cur.has(lv) ? cur.delete(lv) : cur.add(lv); x.kit = { ...(x.kit || { items: [...kitOf(x)] }), levels: { ...(x.kit?.levels || {}), [band]: [...cur] } }; });
  const unlocks = id => lib().all.filter(e => (e.equipment || []).includes(id)).length;
  const usable = lib().all.filter(e => available(e, kit)).length;
  return html`${!embedded && html`<header class="screen-head"><div><div class="sub"><a href="#/you">You</a></div><h1>Equipment on hand</h1></div></header>`}
  <section class="card glass mb-4"><div class="row between wrap"><div><div class="headline">${usable} of ${lib().all.length} moves available</div><p class="callout">Plans only use what you tick — and work in the special kit you own.</p></div>
    <button class="btn text" onClick=${() => update(x => { x.kit = { items: [...DEFAULT_KIT] }; })}>Reset to basics</button></div></section>
  <div class="grid-2">${KIT.map(g => html`<section class="card glass"><div class="kicker mb-3">${g.group}</div>
    <div class="kit-grid">${g.items.map(([id, label]) => html`<button class="kit-item" role="checkbox" aria-checked=${kit.has(id)} onClick=${() => toggle(id)}>
      <span class="kit-tick"><${Icon} n=${kit.has(id) ? 'check' : 'plus'} s=${16} /></span><span class="grow"><span class="t">${label}</span><br/><span class="d">${unlocks(id)} move${unlocks(id) === 1 ? '' : 's'}</span></span></button>
      ${kit.has(id) && ['band', 'mini-band', 'tube-band'].includes(id) && html`<div class="chips" style="padding:0 0 8px 8px" role="group" aria-label=${label + ' resistance levels'}>${BAND_LEVELS.map(lv => html`<button class="chip sm" aria-pressed=${(levels[id] || []).includes(lv)} onClick=${() => setLevel(id, lv)}>${lv}</button>`)}</div>`}`)}</div></section>`)}</div>`;
}
