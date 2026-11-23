// Boot: load data → apply prefs → PIN gate (if set in the classic app) → shell + router.
import { html, render, useState, useEffect } from '../vendor/htm-preact.mjs';
import { loadData } from './data.js';
import { load, subscribe, uiPrefs, state, update, isDemo, enterDemo, setUi } from './store.js';
import { route, onRoute, go } from './router.js';
import { Icon, Logo } from './ui/icons.js';
import { Today } from './screens/today.js';
import { LiveSetup, LivePlayer } from './screens/live.js';
import { Moves } from './screens/moves.js';
import { Progress } from './screens/progress.js';
import { You } from './screens/you.js';
import { Checkups } from './screens/checkups.js';
import * as live from './live/session.js';
import { fmtTime } from './ui/kit.js';

const NAV = [['today', 'Today', 'today'], ['live', 'Live', 'live'], ['moves', 'Moves', 'moves'], ['progress', 'Progress', 'progress'], ['you', 'You', 'you']];

function applyPrefs() {
  const p = uiPrefs(), root = document.documentElement;
  const sys = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const t = p.theme === 'light' || p.theme === 'dark' ? p.theme : sys;
  root.dataset.themeResolved = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f3f5f9' : '#0d111a');
  p.reduceMotion ? root.setAttribute('data-reduce-motion', '') : root.removeAttribute('data-reduce-motion');
  p.solid ? root.setAttribute('data-solid', '') : root.removeAttribute('data-solid');
}

function Shell() {
  const [, force] = useState(0);
  useEffect(() => { const a = onRoute(() => force(x => x + 1)), b = subscribe(() => { applyPrefs(); force(x => x + 1); }), c = live.onSession(() => force(x => x + 1)); return () => { a(); b(); c(); }; }, []);
  useEffect(() => {
    const k = e => {
      if (e.target.closest('input,textarea,select') || document.documentElement.hasAttribute('data-player') || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = '12345'.indexOf(e.key); if (i >= 0) { go('/' + NAV[i][0]); return; }
      if (e.key === '/') { e.preventDefault(); go('/moves'); setTimeout(() => document.querySelector('input[type=search]')?.focus(), 50); }
      if (e.key === 'l' || e.key === 'L') go('/live');
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  const r = route(), top = r.top;
  const playing = r.parts[0] === 'live' && r.parts[1] === 'play';
  const snap = !playing && live.snapshot();
  const Screen = playing ? LivePlayer : { today: Today, live: LiveSetup, moves: Moves, progress: Progress, you: You, checkup: Checkups }[top] || Today;
  return html`
    <nav class="sidenav glass" aria-label="Main">
      <div class="brand"><${Logo} s=${34} /><b>BackForge</b></div>
      <a class="start" href="#/live" aria-label="Start a Live session"><${Icon} n="play" fill /><span>Start a session</span></a>
      ${NAV.map(([k, l, ic]) => html`<a class="nav" href=${'#/' + k} aria-current=${top === k ? 'page' : undefined}><${Icon} n=${ic} /><span>${l}</span></a>`)}
      <a class="nav" href="#/checkup" aria-current=${top === 'checkup' ? 'page' : undefined}><${Icon} n="check" /><span>Check-ups</span></a>
      <div class="grow"></div>
      ${isDemo() && html`<span class="tag" style="justify-content:center;color:var(--c-reward)">Demo</span>`}
    </nav>
    <main class="main" id="main">${html`<${Screen} key=${playing ? 'player' : top} />`}</main>
    ${snap && !snap.done && html`<a class="mini-player glass-thick" href="#/live/play">
      <span class="glyph" style="color:var(--c-accent)"><${Icon} n=${snap.running ? 'live' : 'pause'} s=${22} /></span>
      <span class="grow"><span class="t">${snap.seg.name || 'Live session'}</span><br/><span class="caption">${fmtTime(snap.left)} left</span></span>
      <button class="icon-btn" aria-label=${snap.running ? 'Pause' : 'Play'} onClick=${e => { e.preventDefault(); live.toggle(); }}><${Icon} n=${snap.running ? 'pause' : 'play'} fill=${!snap.running} /></button></a>`}
    <nav class="tabbar glass" aria-label="Main">${NAV.map(([k, l, ic]) => html`<a href=${'#/' + k} aria-current=${top === k ? 'page' : undefined}><${Icon} n=${ic} fill=${top === k && k === 'live'} /><span>${l}</span></a>`)}</nav>`;
}

// ---- PIN gate: same PBKDF2 record the classic app writes (S.profile.pinRecord). A privacy screen, not encryption. ----
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function pinOk(pin, r) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode('bf-pin:' + pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64d(r.saltB64), iterations: r.iterations, hash: 'SHA-256' }, km, 256);
  const a = b64e(bits), b = r.hashB64; let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0;
}
const lockMs = f => (f >= 8 ? Math.min(7.2e6, 1.8e6 + (f - 8) * 1.8e6) : f >= 5 ? 3e5 : f >= 3 ? 3e4 : 0);
function PinGate({ onOpen }) {
  const [buf, setBuf] = useState(''), [msg, setMsg] = useState('');
  const S = state(), lock = S.profile.lock || { fails: 0, lockedUntil: 0 };
  const key = async k => {
    if ((lock.lockedUntil || 0) > Date.now()) { setMsg(`Locked — try again in ${Math.ceil((lock.lockedUntil - Date.now()) / 1000)} s.`); return; }
    if (k === 'del') return setBuf(buf.slice(0, -1));
    const n = buf + k; setBuf(n); if (n.length < 4) return;
    if (await pinOk(n, S.profile.pinRecord)) { update(x => { x.profile.lock = { fails: 0, lockedUntil: 0 }; }); onOpen(); }
    else { update(x => { const L = x.profile.lock ||= { fails: 0, lockedUntil: 0 }; L.fails = (L.fails || 0) + 1; const ms = lockMs(L.fails); if (ms) L.lockedUntil = Date.now() + ms; }); setBuf(''); setMsg('Wrong PIN.'); }
  };
  return html`<div style="position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:24px"><div class="card glass-thick" style="width:min(100%,360px);text-align:center">
    <div style="display:grid;place-items:center"><${Logo} s=${48} /></div><h1 class="title2 mt-3">BackForge</h1><p class="callout">Enter your 4-digit PIN</p>
    <div class="row mt-4" style="justify-content:center;gap:14px" aria-live="polite">${[0, 1, 2, 3].map(i => html`<i style=${`width:14px;height:14px;border-radius:50%;${i < buf.length ? 'background:var(--c-accent)' : 'box-shadow:inset 0 0 0 2px var(--c-ink-3)'}`}></i>`)}</div>
    ${msg && html`<p class="caption mt-2" style="color:var(--c-warn)">${msg}</p>`}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(k => k === '' ? html`<span></span>` : html`<button class="btn ghost" style="min-height:60px;font-size:22px" aria-label=${k === 'del' ? 'Delete' : k} onClick=${() => key(k)}>${k === 'del' ? html`<${Icon} n="back" />` : k}</button>`)}</div>
    <p class="caption mt-4">A privacy screen for this device — it is not encryption.</p></div></div>`;
}

function App() {
  const [open, setOpen] = useState(() => !state().profile?.pinRecord || sessionStorage.getItem('bf_unlocked') === '1');
  return open ? html`<${Shell} />` : html`<${PinGate} onOpen=${() => { try { sessionStorage.setItem('bf_unlocked', '1'); } catch {} setOpen(true); }} />`;
}

(async () => {
  try {
    await loadData();
    const q = new URLSearchParams(location.search);
    if (q.has('demo') && !isDemo()) await enterDemo();
    load(); applyPrefs();
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyPrefs);
    document.addEventListener('visibilitychange', () => document.documentElement.toggleAttribute('data-hidden', document.hidden));
    render(html`<${App} />`, document.getElementById('app'));
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="empty"><h1 class="title2">BackForge couldn't start</h1><p class="callout">${String(e.message || e)}</p><p><a href="classic/index.html">Open the classic app</a></p></div>`;
    console.error(e);
  }
})();
