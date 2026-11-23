// One icon set: 24 px grid, 1.75 stroke, round caps, currentColor. No emoji in UI (protocol §5.7).
import { html } from '../../vendor/htm-preact.mjs';
const P = {
  today: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  live: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l6-3.5z',
  moves: 'M7 4v16M17 4v16M4 8v8M20 8v8M7 12h10',
  progress: 'M4 20h16M6 16l4-5 3 3 5-7',
  you: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  play: 'M8 5.5v13l11-6.5z', pause: 'M8 5v14M16 5v14',
  skip: 'M6 5.5v13l9-6.5zM18 5v14', back: 'M18 5.5v13l-9-6.5zM6 5v14',
  easier: 'M6 9l6 6 6-6M6 4h12', plus: 'M12 5v14M5 12h14',
  voice: 'M4 9.5v5h4l5 4v-13l-5 4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12', voiceoff: 'M4 9.5v5h4l5 4v-13l-5 4zM17 9.5l5 5M22 9.5l-5 5',
  pain: 'M8 13V6a1.5 1.5 0 0 1 3 0v5V4.5a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.5l-1-3a1.5 1.5 0 0 1 2.6-1.3L8 14',
  check: 'M5 12.5l4.5 4.5L19 7.5', flame: 'M12 21c4 0 7-2.8 7-7 0-5-5-6-4.5-11C10 5 9 9 9.5 11 8 10.5 7.5 9 7.5 8 5.5 10 5 12 5 14c0 4.2 3 7 7 7z',
  band: 'M4 12c3-6 5-6 8 0s5 6 8 0', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z', steps: 'M8 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM16 10c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM5 17h5M13 22h5',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 10a3 3 0 0 1 6 0M12 10l1.5-2',
  hrv: 'M3 12h4l2-5 3 10 2-6 2 3h5', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  close: 'M6 6l12 12M18 6 6 18', search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8', lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  chevron: 'M9 6l6 6-6 6', chevdown: 'M6 9l6 6 6-6', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  z2: 'M4 18c2-8 5-12 8-12s6 4 8 12', sync: 'M20 11a8 8 0 0 0-14.3-4.6L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.6L20 16M20 20v-4h-4',
  video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3z', spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  // category glyphs (until per-exercise pose glyphs are drawn)
  core: 'M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 20l3-7h8l3 7M8 13l4-3 4 3', hip: 'M7 4c0 5 2 7 5 7s5-2 5-7M12 11v9M8 20h8',
  glute: 'M6 9c0-3 3-5 6-5s6 2 6 5-2 6-6 11C8 15 6 12 6 9z', strength: 'M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12', mobility: 'M4 16c4 0 4-8 8-8s4 8 8 8',
  warmup: 'M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 3 3', relief: 'M3 14h18M6 14c0-3 2-5 6-5s6 2 6 5', cooldown: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9', desk: 'M4 9h16M6 9v11M18 9v11M8 5h8v4H8z', breath: 'M4 8h10a3 3 0 1 0-3-3M4 12h14a3 3 0 1 1-3 3M4 16h6',
};
export const Icon = ({ n, s = 24, title, class: cls = '', fill = false }) => html`
  <svg class=${cls} width=${s} height=${s} viewBox="0 0 24 24" fill=${fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden=${title ? undefined : 'true'} role=${title ? 'img' : undefined}>
    ${title && html`<title>${title}</title>`}<path d=${P[n] || P.info} /></svg>`;
export const glyphFor = ex => (ex?.tags || []).includes('desk') || String(ex?.id).startsWith('new-') ? 'desk' : ex?.id === 'breathing360' || ex?.id === 'constructiverest' ? 'breath' : (P[ex?.category] ? ex.category : 'mobility');
export const Logo = ({ s = 32 }) => html`<svg width=${s} height=${s} viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.92 0.19 124)"/><stop offset="1" stop-color="oklch(0.78 0.13 200)"/></linearGradient></defs><rect width="32" height="32" rx="10" fill="url(#lg)"/><g fill="oklch(0.2 0.05 124)"><rect x="13" y="5" width="6" height="4" rx="2"/><rect x="12" y="10.5" width="8" height="4.5" rx="2.2"/><rect x="11.5" y="16.5" width="9" height="4.5" rx="2.2"/><rect x="12.5" y="22.5" width="7" height="4" rx="2"/></g></svg>`;
