// Code-drawn exercise demos: a stick figure posed from joint angles (forward kinematics),
// 2–4 keyframes eased into a short stop-motion loop. Poses + props live in data/figures.json.
// Colours come only from tokens: --c-ink figure, --c-accent working limb / band, --c-ink-3 props.
import { html, useEffect, useRef, useState } from '../../vendor/htm-preact.mjs';

const DATA = await fetch(new URL('../../../data/figures.json', import.meta.url)).then(r => (r.ok ? r.json() : null)).catch(() => null) || { base: {}, figures: {} };

/** True when this exercise has a code-drawn demo. */
export const hasFigure = id => !!DATA.figures[id];

const W = 200, H = 120, FLOOR = 112;
const LEN = { trunk: 30, neck: 4, head: 7.5, arm: 18, fore: 16, hand: 5, thigh: 24, shin: 23, foot: 8, pelvis: 6 };
const LIMB = 7, TRUNK = 9, FAR = 0.42;
const INK = 'var(--c-ink)', ACC = 'var(--c-accent)', PROP = 'var(--c-ink-3)';
const DEF = { hip: [100, 62], trunk: 0, nArm: 180, nFore: 180, fArm: 180, fFore: 180, nThigh: 180, nShin: 180, fThigh: 180, fShin: 180 };
const NUM = ['shx', 'shy', 'trunk', 'chest', 'neck', 'face', 'pelvis', 'sw', 'hw', 'nArm', 'nFore', 'nHand', 'fArm', 'fFore', 'fHand', 'nThigh', 'nShin', 'nFoot', 'fThigh', 'fShin', 'fFoot'];

// angle convention: degrees, 0 = up, 90 = the way the figure faces (screen right), 180 = down
const dir = a => [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)];
const add = (p, a, l) => { const d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
const mix = (a, b, t) => a + (b - a) * t;

/** base posture + figure base + frame overrides → full pose. `like: n` starts from frame n. */
function resolve(fig, i, seen = 0) {
  const f = fig.frames[i] || {};
  const start = f.like != null && seen < 4 ? resolve(fig, f.like, seen + 1) : { ...DEF, ...(DATA.base[f.base || fig.base] || {}), ...(fig.pose || {}) };
  const out = { ...start, ...f, s: { ...(start.s || {}), ...(f.s || {}) } };
  delete out.like; delete out.base;
  return out;
}

function lerpPose(a, b, t) {
  const o = { ...a, hip: [mix(a.hip[0], b.hip[0], t), mix(a.hip[1], b.hip[1], t)], s: {} };
  for (const k of NUM) if (a[k] != null || b[k] != null) o[k] = mix(a[k] ?? b[k] ?? 0, b[k] ?? a[k] ?? 0, t);
  for (const k of new Set([...Object.keys(a.s), ...Object.keys(b.s)])) o.s[k] = mix(a.s[k] ?? 1, b.s[k] ?? 1, t);
  if (a.pin && b.pin && a.pin[0] === b.pin[0]) o.pin = [a.pin[0], a.pin[1] == null ? null : mix(a.pin[1], b.pin[1], t), a.pin[2] == null ? null : mix(a.pin[2], b.pin[2], t)];
  else o.pin = null;
  return o;
}

/** Forward kinematics: pose → named points. */
function solve(p, view) {
  const sc = k => p.s?.[k] ?? 1, side = view === 'side';
  const trunk = p.trunk, chest = p.chest ?? trunk, neck = p.neck ?? chest;
  const P = { hip: p.hip };
  P.mid = add(P.hip, trunk, LEN.trunk / 2 * sc('trunk'));
  P.sh = add(P.mid, chest, LEN.trunk / 2 * sc('trunk') * sc('chest'));
  P.neck = add(P.sh, neck, LEN.neck * sc('neck'));
  P.head = add(P.neck, neck, LEN.head * sc('neck'));
  const sw = p.sw ?? (side ? 0 : 10), hw = p.hw ?? (side ? 0 : 6);
  P.nSh = add(P.sh, chest + 90, sw); P.fSh = add(P.sh, chest - 90, sw);
  if (p.shx || p.shy) for (const k of ['nSh', 'fSh']) P[k] = add(add(P[k], chest + 90, p.shx || 0), chest, p.shy || 0); // shoulder blades: forward/back, up/down
  P.nHp = add(P.hip, trunk + 90, hw); P.fHp = add(P.hip, trunk - 90, hw);
  for (const s of 'nf') {
    P[s + 'El'] = add(P[s + 'Sh'], p[s + 'Arm'], LEN.arm * sc(s + 'Arm'));
    P[s + 'Wr'] = add(P[s + 'El'], p[s + 'Fore'], LEN.fore * sc(s + 'Fore'));
    P[s + 'Hd'] = p[s + 'Hand'] != null ? add(P[s + 'Wr'], p[s + 'Hand'], LEN.hand * sc(s + 'Hand')) : P[s + 'Wr'];
    P[s + 'Kn'] = add(P[s + 'Hp'], p[s + 'Thigh'], LEN.thigh * sc(s + 'Thigh'));
    P[s + 'An'] = add(P[s + 'Kn'], p[s + 'Shin'], LEN.shin * sc(s + 'Shin'));
    const foot = p[s + 'Foot'] ?? (side || s === 'n' ? p[s + 'Shin'] - 90 : p[s + 'Shin'] + 90);
    P[s + 'Toe'] = add(P[s + 'An'], foot, LEN.foot * (p.s?.[s + 'Foot'] ?? (side ? 1 : 0.55)));
  }
  if (p.pin) {
    const q = P[p.pin[0]];
    if (q) { const dx = p.pin[1] == null ? 0 : p.pin[1] - q[0], dy = p.pin[2] == null ? 0 : p.pin[2] - q[1]; for (const k in P) P[k] = [P[k][0] + dx, P[k][1] + dy]; }
  }
  P._p = p;
  return P;
}

/** "nKn" | "nKn~nWr" (midpoint) | "nThigh:0.7" (along a segment) | [x, y] | ["nKn", dx, dy] | ["mid", fwd, up, "t"|"c"] (offset in the trunk / chest frame) */
const SEG = { trunk: ['hip', 'sh'], chest: ['mid', 'sh'], nArm: ['nSh', 'nEl'], nFore: ['nEl', 'nWr'], nThigh: ['nHp', 'nKn'], nShin: ['nKn', 'nAn'], nFoot: ['nAn', 'nToe'], fArm: ['fSh', 'fEl'], fFore: ['fEl', 'fWr'], fThigh: ['fHp', 'fKn'], fShin: ['fKn', 'fAn'], fFoot: ['fAn', 'fToe'] };
function pt(P, r) {
  if (Array.isArray(r)) {
    if (typeof r[0] !== 'string') return r;
    const q = pt(P, r[0]);
    if (r[3]) { const a = r[3] === 'c' ? P._p.chest ?? P._p.trunk : P._p.trunk; return add(add(q, a + 90, r[1] || 0), a, r[2] || 0); }
    return [q[0] + (r[1] || 0), q[1] + (r[2] || 0)];
  }
  if (r.includes('~')) { const [a, b] = r.split('~').map(x => pt(P, x)); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  if (r.includes(':')) { const [s, t] = r.split(':'); const [a, b] = SEG[s].map(x => P[x]); return [mix(a[0], b[0], +t), mix(a[1], b[1], +t)]; }
  return P[r] || [0, 0];
}

const r1 = n => Math.round(n * 10) / 10;
const ln = (a, b, w, c, o = 1) => ({ t: 'line', x1: r1(a[0]), y1: r1(a[1]), x2: r1(b[0]), y2: r1(b[1]), w, c, o });
const pl = (pts, w, c, o = 1) => ({ t: 'path', d: 'M' + pts.map(q => `${r1(q[0])} ${r1(q[1])}`).join('L'), w, c, o });
const ci = (q, r, c, fill, w = 2, o = 1) => ({ t: 'circle', cx: r1(q[0]), cy: r1(q[1]), r, c, fill, w, o });

function propShapes(P, pr) {
  const g = r => pt(P, r), out = [];
  switch (pr.t) {
    case 'floor': out.push(ln([pr.x0 ?? 4, pr.y ?? FLOOR + 4], [pr.x1 ?? 196, pr.y ?? FLOOR + 4], 2, PROP)); break;
    case 'wall': out.push(ln([pr.x, pr.y0 ?? 6], [pr.x, FLOOR + 4], 3, PROP)); break;
    case 'panel': out.push({ t: 'rect', x: pr.x, y: pr.y, w: pr.w, h: pr.h, c: PROP, fill: 0.14 }); break;
    case 'post': out.push(ln([pr.x, pr.y0 ?? 4], [pr.x, FLOOR + 4], 5, PROP)); if (pr.anchor != null) out.push(ln([pr.x - 3, pr.anchor], [pr.x + 3, pr.anchor], 4, PROP)); break;
    case 'anchor': { const q = g(pr.at); out.push(ci(q, 2.5, PROP, 1)); break; }
    case 'chair': { // side view; x = front edge of seat, y = seat top, back on the left unless dir:-1
      const d = pr.dir ?? 1, x0 = pr.x - 24 * d, y = pr.y + 2;
      out.push(ln([x0, y], [pr.x, y], 4, PROP), ln([pr.x - 2 * d, y], [pr.x - 2 * d, FLOOR + 3], 2.5, PROP), ln([x0 + 2 * d, y], [x0 + 2 * d, FLOOR + 3], 2.5, PROP));
      if (pr.back !== false) out.push(ln([x0 + 1 * d, y], [x0 - 2 * d, y - (pr.backH ?? 30)], 3, PROP)); break;
    }
    case 'chairFront': { const y = pr.y + 2, hw = pr.w ?? 16; out.push(ln([pr.x - hw, y], [pr.x + hw, y], 4, PROP), ln([pr.x - hw + 2, y], [pr.x - hw + 2, FLOOR + 3], 2.5, PROP), ln([pr.x + hw - 2, y], [pr.x + hw - 2, FLOOR + 3], 2.5, PROP)); if (pr.back) out.push(ln([pr.x - hw + 2, y], [pr.x - hw + 2, y - 30], 2.5, PROP), ln([pr.x + hw - 2, y], [pr.x + hw - 2, y - 30], 2.5, PROP)); break; }
    case 'desk': out.push(ln([pr.x0, pr.y], [pr.x1, pr.y], 4, PROP), ln([pr.x0 + 3, pr.y], [pr.x0 + 3, FLOOR + 3], 2.5, PROP), ln([pr.x1 - 3, pr.y], [pr.x1 - 3, FLOOR + 3], 2.5, PROP)); break;
    case 'step': out.push({ t: 'rect', x: pr.x0, y: pr.y, w: pr.x1 - pr.x0, h: FLOOR + 4 - pr.y, c: PROP, fill: 0.25, w2: 2 }); break;
    case 'block': { const q = g(pr.at), w = pr.w ?? 12, h = pr.h ?? 7; out.push({ t: 'rect', x: q[0] - w / 2, y: q[1] - h / 2, w, h, c: PROP, fill: 0.5, w2: 2 }); break; }
    case 'pillow': { const q = g(pr.at); out.push({ t: 'ellipse', cx: q[0], cy: q[1], rx: pr.w ?? 9, ry: pr.h ?? 4, c: PROP, fill: 0.4 }); break; }
    case 'roller': { const q = g(pr.at); out.push(ci(q, pr.r ?? 6, PROP, 0.35, 2)); break; }
    case 'rollerLong': out.push(ln(g(pr.from), g(pr.to), 11, PROP, 0.55)); break;
    case 'ball': { const q = g(pr.at); out.push(ci(q, pr.r ?? 4, PROP, 0.35, 2)); break; }
    case 'kb': { const q = g(pr.at); out.push(ci([q[0], q[1] + 8], 6, PROP, 0.6, 2), ci([q[0], q[1] + 1], 3.2, PROP, 0, 2)); break; }
    case 'db': { const q = g(pr.at), h = pr.h ?? 0; out.push(ln([q[0] - (h ? 6 : 0), q[1] - (h ? 0 : 6)], [q[0] + (h ? 6 : 0), q[1] + (h ? 0 : 6)], 3, PROP), ci([q[0] - (h ? 6 : 0), q[1] - (h ? 0 : 6)], 2.6, PROP, 1), ci([q[0] + (h ? 6 : 0), q[1] + (h ? 0 : 6)], 2.6, PROP, 1)); break; }
    case 'stick': { const a = g(pr.from), b = g(pr.to), e = pr.ext ?? 0, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; out.push(ln([a[0] - ux * e, a[1] - uy * e], [b[0] + ux * e, b[1] + uy * e], pr.w ?? 2.5, PROP)); break; }
    case 'strap': out.push(pl(pr.pts.map(g), 3, PROP)); break;
    case 'band': out.push(pl(pr.pts.map(g), 2.2, ACC)); break;
    case 'loop': { // mini-band: a ring round one point, or a capsule round two
      const a = g(pr.a), b = g(pr.b ?? pr.a), r = pr.r ?? 4.5, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.5) { out.push(ci(a, r, ACC, 0, 2.2)); break; }
      const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy * r, ny = ux * r;
      out.push({ t: 'path', d: `M${r1(a[0] + nx)} ${r1(a[1] + ny)}L${r1(b[0] + nx)} ${r1(b[1] + ny)}A${r} ${r} 0 0 0 ${r1(b[0] - nx)} ${r1(b[1] - ny)}L${r1(a[0] - nx)} ${r1(a[1] - ny)}A${r} ${r} 0 0 0 ${r1(a[0] + nx)} ${r1(a[1] + ny)}Z`, w: 2.2, c: ACC, o: 1 }); break;
    }
    case 'bar': { const q = g(pr.at); out.push(ln([q[0] - 14, q[1]], [q[0] + 14, q[1]], 3, PROP), ci(q, 3, PROP, 1)); break; }
    case 'slider': { const q = g(pr.at); out.push(ln([q[0] - 5, q[1]], [q[0] + 5, q[1]], 3, PROP)); break; }
    case 'line': out.push(ln(g(pr.from), g(pr.to), pr.w ?? 1.5, PROP)); break;
    case 'arrow': { const q = g(pr.at), a = pr.dir ?? 90, l = pr.len ?? 10, e = add(q, a, l); out.push(pl([q, e], 1.8, ACC), pl([add(e, a + 150, 4), e, add(e, a - 150, 4)], 1.8, ACC)); break; }
  }
  return out;
}

/** Scene: a constant-length list of primitives for a pose (so frames can be patched in place). */
function scene(fig, pose) {
  const view = fig.view || 'side', P = solve(pose, view), work = new Set(fig.work || []);
  const hot = k => work.has(k) || work.has(k.slice(0, 1) + (/(Arm|Fore|Hand)$/.test(k) ? 'Arm*' : /(Thigh|Shin|Foot)$/.test(k) ? 'Leg*' : '-'));
  const col = k => (hot(k) ? ACC : INK);
  const back = [], body = [], front = [];
  for (const pr of fig.props || []) (pr.front ? front : back).push(...propShapes(P, pr));
  const arm = s => { const o = s === 'f' && view === 'side' ? FAR : 1; return [ln(P[s + 'Sh'], P[s + 'El'], LIMB, col(s + 'Arm'), o), ln(P[s + 'El'], P[s + 'Wr'], LIMB, col(s + 'Fore'), o), ln(P[s + 'Wr'], P[s + 'Hd'], LIMB - 1.5, col(s + 'Hand'), o)]; };
  const leg = s => { const o = s === 'f' && view === 'side' ? FAR : 1; return [ln(P[s + 'Hp'], P[s + 'Kn'], LIMB + 0.5, col(s + 'Thigh'), o), ln(P[s + 'Kn'], P[s + 'An'], LIMB, col(s + 'Shin'), o), ln(P[s + 'An'], P[s + 'Toe'], LIMB - 2, col(s + 'Foot'), o)]; };
  const torso = [ln(P.hip, P.mid, TRUNK, col('trunk')), ln(P.mid, P.sh, TRUNK, col('chest'))];
  if (view !== 'side') torso.push(ln(P.nSh, P.fSh, LIMB, col('chest')), ln(P.nHp, P.fHp, LIMB, col('trunk')));
  const neck = ln(P.sh, P.neck, 5, col('neck'));
  const head = ci(P.head, LEN.head, col('head'), 1, 0);
  const nose = pose.face != null || view === 'side' ? (() => { const a = pose.face ?? (pose.neck ?? pose.chest ?? pose.trunk) + 90, b = add(P.head, a, LEN.head - 1); return ln(b, add(b, a, 2.6), 3, col('head')); })() : null;
  // pelvis: a tilted bowl round the hip joint (only when a figure poses it), long axis = crest→sit-bone line
  const pelvis = pose.pelvis != null ? { t: 'ellipse', cx: r1(P.hip[0]), cy: r1(P.hip[1]), rx: 10, ry: 5.5, rot: r1(pose.pelvis - 90), c: work.has('pelvis') ? ACC : INK, fill: 0, w: 2.5 } : null;
  const order = fig.order || (view === 'top' ? 'legs,torso,arms,head' : 'farArm,farLeg,torso,head,nearLeg,nearArm');
  for (const part of order.split(',')) {
    if (part === 'farArm') body.push(...arm('f'));
    else if (part === 'farLeg') body.push(...leg('f'));
    else if (part === 'nearArm') body.push(...arm('n'));
    else if (part === 'nearLeg') body.push(...leg('n'));
    else if (part === 'arms') body.push(...arm('f'), ...arm('n'));
    else if (part === 'legs') body.push(...leg('f'), ...leg('n'));
    else if (part === 'torso') body.push(...torso);
    else if (part === 'head') body.push(neck, head, ...(nose ? [nose] : []));
  }
  return [...back, ...body, ...(pelvis ? [pelvis] : []), ...front];
}

const NS = 'http://www.w3.org/2000/svg';
function paint(g, prims) {
  while (g.childNodes.length > prims.length) g.lastChild.remove();
  prims.forEach((q, i) => {
    let el = g.childNodes[i];
    if (!el || el.tagName !== q.t) { const n = document.createElementNS(NS, q.t); el ? g.replaceChild(n, el) : g.appendChild(n); el = n; }
    const st = el.style;
    if (q.t === 'line') { el.setAttribute('x1', q.x1); el.setAttribute('y1', q.y1); el.setAttribute('x2', q.x2); el.setAttribute('y2', q.y2); st.stroke = q.c; st.strokeWidth = q.w; st.strokeLinecap = 'round'; st.opacity = q.o; }
    else if (q.t === 'path') { el.setAttribute('d', q.d); st.fill = 'none'; st.stroke = q.c; st.strokeWidth = q.w; st.strokeLinecap = st.strokeLinejoin = 'round'; st.opacity = q.o; }
    else if (q.t === 'circle') { el.setAttribute('cx', q.cx); el.setAttribute('cy', q.cy); el.setAttribute('r', q.r); if (q.fill === 1) { st.fill = q.c; st.stroke = 'none'; } else { st.fill = q.c; st.fillOpacity = q.fill; st.stroke = q.c; st.strokeWidth = q.w; } st.opacity = q.o; }
    else if (q.t === 'rect') { el.setAttribute('x', r1(q.x)); el.setAttribute('y', r1(q.y)); el.setAttribute('width', r1(q.w)); el.setAttribute('height', r1(q.h)); el.setAttribute('rx', 1.5); st.fill = q.c; st.fillOpacity = q.fill; st.stroke = q.w2 ? q.c : 'none'; st.strokeWidth = q.w2 || 0; }
    else if (q.t === 'ellipse') { el.setAttribute('cx', r1(q.cx)); el.setAttribute('cy', r1(q.cy)); el.setAttribute('rx', q.rx); el.setAttribute('ry', q.ry); el.setAttribute('transform', q.rot ? `rotate(${q.rot} ${r1(q.cx)} ${r1(q.cy)})` : ''); st.fill = q.c; st.fillOpacity = q.fill; st.stroke = q.c; st.strokeWidth = q.w || 1.5; }
  });
}

/** Timeline: frames in order, looping back to the first; `hold` ms at each, moves share the rest. */
function timeline(fig) {
  const n = fig.frames.length, dur = Math.min(3200, Math.max(2400, fig.dur || 2800));
  const hold = fig.frames.map((_, i) => fig.hold?.[i] ?? 350);
  const move = Math.max(300, (dur - hold.reduce((a, b) => a + b, 0)) / n);
  const poses = fig.frames.map((_, i) => resolve(fig, i));
  // resolve pins at the keyframes so poses with different pins still blend without jumps
  const fixed = poses.map(p => { if (!p.pin) return p; const P = solve(p, fig.view || 'side'); return { ...p, hip: [P.hip[0], P.hip[1]] }; });
  const total = hold.reduce((a, b) => a + b, 0) + move * n;
  return { total, at(ms) {
    let t = ms % total;
    for (let i = 0; i < n; i++) {
      if (t < hold[i]) return poses[i];
      t -= hold[i];
      if (t < move) { const j = (i + 1) % n, e = 0.5 - Math.cos(Math.PI * t / move) / 2; const a = fixed[i], b = fixed[j]; const o = lerpPose(a, b, e); if (!(a.pin && b.pin && a.pin[0] === b.pin[0])) o.pin = null; else o.hip = [mix(a.hip[0], b.hip[0], e), mix(a.hip[1], b.hip[1], e)]; return o; }
      t -= move;
    }
    return poses[0];
  } };
}

const reduceNow = () => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.hasAttribute('data-reduce-motion');
function useReduced() {
  const [r, set] = useState(reduceNow);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)'), on = () => set(reduceNow());
    mq.addEventListener?.('change', on);
    const mo = new MutationObserver(on); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduce-motion'] });
    return () => { mq.removeEventListener?.('change', on); mo.disconnect(); };
  }, []);
  return r;
}

function Still({ fig, i }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) paint(ref.current, scene(fig, resolve(fig, i))); }, [fig, i]);
  return html`<svg viewBox=${(fig.box || [0, 0, W, H]).join(' ')} class="figure-frame" aria-hidden="true" style="display:block;width:100%;height:auto"><g ref=${ref} transform=${fig.flip ? `translate(${W} 0) scale(-1 1)` : null} /></svg>`;
}

const WIDTH = { sm: '64px', md: '100%', lg: '100%' };
/**
 * Code-drawn demo for an exercise. Loops (pauses off-screen); with reduced motion shows the
 * start and end positions side by side. `still` = frame indices to show side by side instead.
 */
export function Figure({ id, size = 'md', label, still }) {
  const fig = DATA.figures[id], reduced = useReduced(), ref = useRef(null), box = useRef(null);
  const frames = still || (reduced && fig ? [0, fig.end ?? 1] : null);
  useEffect(() => {
    if (!fig || frames || !ref.current) return;
    const tl = timeline(fig), g = ref.current; let raf = 0, t0 = performance.now(), vis = true, last = -1;
    const tick = now => { raf = requestAnimationFrame(tick); if (!vis || document.hidden) return; const ms = now - t0; if (ms - last < 30) return; last = ms; paint(g, scene(fig, tl.at(ms))); };
    paint(g, scene(fig, tl.at(0))); raf = requestAnimationFrame(tick);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => { vis = es[0].isIntersecting; }) : null; io?.observe(box.current);
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [fig, !!frames]);
  if (!fig) return null;
  const name = label ? `${label}: ` : '';
  const style = `margin:0;width:${WIDTH[size] || WIDTH.md};max-width:${size === 'md' ? '360px' : 'none'};flex:none`;
  if (frames) return html`<figure ref=${box} class=${`figure figure-${size} figure-still`} role="img" aria-label=${`${name}${frames.length > 2 ? 'positions' : 'start and end position'}${fig.note ? ' — ' + fig.note : ''}`} style=${style + ';display:flex;gap:4px;align-items:center'}>
    ${frames.map(i => html`<div style="flex:1 1 0;min-width:0"><${Still} fig=${fig} i=${i} /></div>`)}</figure>`;
  return html`<figure ref=${box} class=${`figure figure-${size}`} role="img" aria-label=${`${name}demo${fig.note ? ' — ' + fig.note : ''}`} style=${style}>
    <svg viewBox=${(fig.box || [0, 0, W, H]).join(' ')} aria-hidden="true" style="display:block;width:100%;height:auto"><g ref=${ref} transform=${fig.flip ? `translate(${W} 0) scale(-1 1)` : null} /></svg></figure>`;
}
