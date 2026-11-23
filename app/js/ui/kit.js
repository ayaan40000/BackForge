// Small shared components: ring, sparkline, charts, sheet, segmented control, pain scale.
import { html, useEffect, useRef, useState } from '../../vendor/htm-preact.mjs';
import { Icon } from './icons.js';

export function Ring({ value = 0, max = 100, size = 128, stroke = 11, color, children, label }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(t); }, [value]);
  return html`<div class="ring" style=${`--size:${size}px;--stroke:${stroke}px;--ring:${color || 'var(--c-accent)'}`} role="img" aria-label=${label}>
    <svg viewBox=${`0 0 ${size} ${size}`}><circle class="track" cx=${size / 2} cy=${size / 2} r=${r} />
      <circle class="val" cx=${size / 2} cy=${size / 2} r=${r} stroke-dasharray=${c} stroke-dashoffset=${c * (1 - Math.max(0, Math.min(1, shown / max)))} /></svg>
    <div class="mid">${children}</div></div>`;
}

/** Path helpers */
const scale = (v, a, b, A, B) => (b === a ? (A + B) / 2 : A + ((v - a) / (b - a)) * (B - A));
export function linePath(pts, w, h, pad = 2, lo, hi) {
  const ys = pts.filter(p => p != null);
  if (ys.length < 2) return '';
  const min = lo ?? Math.min(...ys), max = hi ?? Math.max(...ys);
  let d = '', pen = false;
  pts.forEach((v, i) => {
    if (v == null) return; // sparklines connect across missing days
    const x = scale(i, 0, pts.length - 1, pad, w - pad), y = scale(v, min, max, h - pad, pad);
    d += (pen ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); pen = true;
  });
  return d;
}
export const Spark = ({ data, color = 'var(--c-accent)', h = 30, area = true }) => {
  const w = 120, d = linePath(data, w, h, 3);
  if (!d) return html`<svg class="spark" viewBox=${`0 0 ${w} ${h}`}></svg>`;
  return html`<svg class="spark" viewBox=${`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
    ${area && html`<path d=${d + `L${w - 3} ${h}L3 ${h}Z`} fill=${color} opacity=".12" />`}
    <path d=${d} fill="none" stroke=${color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" /></svg>`;
};

/** Line chart with optional baseline band and 7-day average. */
export function LineChart({ data, labels = [], color, lo, hi, band, avg = false, h = 160, label, unit = '', dots = false, trend = null }) {
  const w = 600, padL = 30, padB = 20, ys = data.filter(v => v != null);
  if (ys.length < 2) return html`<p class="caption">Not enough data yet.</p>`;
  const min = lo ?? Math.floor(Math.min(...ys, ...(band ? [band[0]] : [])) * 0.97), max = hi ?? Math.ceil(Math.max(...ys, ...(band ? [band[1]] : [])) * 1.03);
  const X = i => scale(i, 0, data.length - 1, padL, w - 4), Y = v => scale(v, min, max, h - padB, 6);
  const path = (arr) => { let d = '', pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; }); return d; };
  const ma = avg ? data.map((_, i) => { const win = data.slice(Math.max(0, i - 6), i + 1).filter(v => v != null); return win.length ? win.reduce((a, b) => a + b, 0) / win.length : null; }) : null;
  const ticks = [min, (min + max) / 2, max];
  const step = Math.max(1, Math.floor(data.length / 5));
  return html`<svg class="chart" viewBox=${`0 0 ${w} ${h}`} role="img" aria-label=${label}>
    ${ticks.map(t => html`<line class="grid" x1=${padL} x2=${w} y1=${Y(t)} y2=${Y(t)} /><text x="0" y=${Y(t) + 4}>${Math.round(t * 10) / 10}</text>`)}
    ${band && html`<rect x=${padL} width=${w - padL} y=${Y(band[1])} height=${Math.max(0, Y(band[0]) - Y(band[1]))} fill=${color} opacity=".10" rx="4" />`}
    ${dots ? data.map((v, i) => v != null && html`<circle cx=${X(i)} cy=${Y(v)} r="3" fill=${color} opacity=${avg || trend ? .4 : 1} />`) : html`<path class=${avg ? '' : 'draw'} d=${path(data)} fill="none" stroke=${color} stroke-width=${avg ? 1.5 : 2.5} opacity=${avg ? .45 : 1} stroke-linejoin="round" stroke-linecap="round" />`}
    ${trend && html`<path class="draw" d=${path(trend)} fill="none" stroke=${color} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />`}
    ${ma && html`<path class="draw" d=${path(ma)} fill="none" stroke=${color} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />`}
    ${labels.map((l, i) => i % step === 0 && html`<text x=${X(i)} y=${h - 4} text-anchor="middle">${l}</text>`)}
  </svg>`;
}

/** Bars (optionally stacked: data = [[a,b,c],...] with colors[]) and an optional reference line. */
export function Bars({ data, colors = ['var(--c-accent)'], labels = [], h = 150, label, goal: ref, refLabel, max: forcedMax }) {
  const w = 600, padB = 20, padL = 30, stacks = data.map(d => (Array.isArray(d) ? d : [d]));
  const max = forcedMax ?? Math.max(1, ...stacks.map(s => s.reduce((a, b) => a + (b || 0), 0)), ref || 0) * 1.08;
  const bw = (w - padL) / data.length, Y = v => (h - padB) - (v / max) * (h - padB - 6);
  const step = Math.max(1, Math.ceil(data.length / 8));
  return html`<svg class="chart" viewBox=${`0 0 ${w} ${h}`} role="img" aria-label=${label}>
    <line class="grid" x1=${padL} x2=${w} y1=${h - padB} y2=${h - padB} />
    <text x="0" y="14">${Math.round(max)}</text>
    ${stacks.map((s, i) => { let acc = 0; return s.map((v, k) => { const y0 = Y(acc), y1 = Y(acc += v || 0); return v ? html`<rect x=${padL + i * bw + bw * 0.16} width=${bw * 0.68} y=${y1} height=${Math.max(0, y0 - y1)} rx=${Math.min(4, bw * 0.2)} fill=${colors[k % colors.length]} />` : null; }); })}
    ${ref != null && html`<line x1=${padL} x2=${w} y1=${Y(ref)} y2=${Y(ref)} stroke="var(--c-ink-2)" stroke-dasharray="4 4" /><text x=${w - 4} y=${Y(ref) - 5} text-anchor="end">${refLabel}</text>`}
    ${labels.map((l, i) => i % step === 0 && html`<text x=${padL + i * bw + bw / 2} y=${h - 4} text-anchor="middle">${l}</text>`)}
  </svg>`;
}

export function Seg({ options, value, onChange, label }) {
  return html`<div class="seg glass-thin" role="tablist" aria-label=${label} onKeyDown=${e => {
    const i = options.findIndex(o => o[0] === value);
    if (e.key === 'ArrowRight') onChange(options[(i + 1) % options.length][0]);
    if (e.key === 'ArrowLeft') onChange(options[(i - 1 + options.length) % options.length][0]);
  }}>${options.map(([v, l]) => html`<button role="tab" aria-selected=${v === value} tabindex=${v === value ? 0 : -1} onClick=${() => onChange(v)}>${l}</button>`)}</div>`;
}

export function PainScale({ value, onPick, marker }) {
  return html`<div class="pain-scale" role="radiogroup" aria-label="Pain from 0 (none) to 10 (worst imaginable)">
    ${Array.from({ length: 11 }, (_, i) => html`<button role="radio" aria-checked=${value === i} style=${`--i:${i}`} aria-label=${i === 0 ? '0, no pain' : i === 10 ? '10, worst imaginable' : String(i)} onClick=${() => onPick(i)}
      title=${marker === i ? 'Before the session' : ''}>${i}${marker === i ? html`<span class="sr-only"> (before)</span>` : ''}</button>`)}</div>`;
}

/** Native <dialog> sheet: focus trap + Esc for free. */
export function Sheet({ open, onClose, children, label }) {
  const ref = useRef();
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return html`<dialog class="sheet" ref=${ref} aria-label=${label} onClose=${onClose} onClick=${e => { if (e.target === ref.current) onClose(); }}>
    <div class="panel glass-thick"><div class="grabber" aria-hidden="true"></div>
      <button class="icon-btn glass-thin" style="position:absolute;right:14px;top:14px" aria-label="Close" onClick=${onClose}><${Icon} n="close" s=${20} /></button>
      ${open && children}</div></dialog>`;
}

export const fmtTime = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
export const fmtNum = n => (n == null ? '—' : Math.round(n).toLocaleString());

/** Two-frame stop-motion demo (start ↔ end position). Reduced motion: both frames side by side. */
export function Flip({ media, size = 'md', label }) {
  if (!media) return null;
  return html`<figure class=${`flip flip-${size}`} aria-label=${label ? `${label}: start and end position` : 'Start and end position'}>
    <img src=${media.frames[0]} alt="Start position" loading="lazy" decoding="async" /><img src=${media.frames[1]} alt="End position" loading="lazy" decoding="async" />
    ${size !== 'sm' && html`<figcaption>${media.similar ? media.similar + ' · ' : ''}Photo: <a href=${media.source} target="_blank" rel="noopener">free-exercise-db</a> (public domain)</figcaption>`}</figure>`;
}
