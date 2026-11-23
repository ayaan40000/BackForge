// Progress: Overview · Health · Body · Posture.
import { html, useState } from '../../vendor/htm-preact.mjs';
import { Icon } from '../ui/icons.js';
import { Seg, LineChart, Bars, fmtNum } from '../ui/kit.js';
import { state, importHealth } from '../store.js';
import { ctx, series, dayLabels, mean, sd, insights, healthDays, lib, hasHealth } from '../data.js';
import { gate, weeklySessions, exerciseResponse, streak } from '../engine/progress.js';
import { dayStr, addDays, daysBetween, weekday } from '../engine/dates.js';
import { route, go } from '../router.js';

export function Progress() {
  const seg = route().parts[1] || 'overview';
  return html`<header class="screen-head"><div><div class="sub">Pain, consistency, health</div><h1>Progress</h1></div></header>
  <div style="position:sticky;top:8px;z-index:4;margin-bottom:16px"><${Seg} label="Progress sections" value=${seg} onChange=${v => go('/progress/' + v, { replace: true })} options=${[['overview', 'Overview'], ['health', 'Health'], ['body', 'Body'], ['posture', 'Posture']]} /></div>
  ${seg === 'overview' ? html`<${Overview} />` : seg === 'health' ? html`<${Health} />` : seg === 'body' ? html`<${Body} />` : html`<${Posture} />`}`;
}

function Heatmap() {
  const S = state(), byDay = {};
  for (const l of S.log) byDay[l.date] = Math.max(byDay[l.date] || 0, l.kind === 'micro' || l.kind === 'repair' ? 1 : (l.mins || 20) >= 30 ? 3 : 2);
  const weeks = 17, t = dayStr(), start = addDays(t, -weekday(t) - (weeks - 1) * 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = addDays(start, i); return d > t ? null : { d, l: byDay[d] || 0 }; });
  const active = Object.keys(byDay).filter(d => daysBetween(d, t) < weeks * 7).length;
  return html`<section class="card glass"><div class="row between"><div class="kicker">Consistency · 17 weeks</div><span class="caption">${active} active days</span></div>
    <div class="heat mt-3" role="img" aria-label=${`${active} active days in the last 17 weeks`}>${cells.map(c => html`<i data-l=${c ? c.l : 0} style=${c ? '' : 'visibility:hidden'} title=${c?.d}></i>`)}</div>
    <div class="legend mt-2"><span><i style="background:var(--c-surface-2)"></i>Rest</span><span><i style="background:color-mix(in oklab,var(--viz-sess) 35%,var(--c-surface-2))"></i>Micro</span><span><i style="background:var(--viz-sess)"></i>Full</span></div></section>`;
}

function Overview() {
  const S = state(), c = ctx(), g = gate(c), [n, setN] = useState(30);
  const pain = Array.from({ length: n }, (_, i) => { const d = addDays(dayStr(), i - n + 1); return S.checkins.find(x => x.date === d)?.pain ?? null; });
  const wk = weeklySessions(c, 12), resp = exerciseResponse(c);
  const helps = Object.entries(resp).filter(([, v]) => v.verdict === 'helps').sort((a, b) => a[1].dAvg - b[1].dAvg).slice(0, 3);
  const watch = Object.entries(resp).filter(([, v]) => v.verdict === 'watch').slice(0, 2);
  const ins = insights();
  return html`<div class="grid-2"><div class="col">
    <section class="card glass"><div class="row between"><div class="kicker">Pain trend</div><${Seg} label="Range" value=${n} onChange=${setN} options=${[[14, '14 d'], [30, '30 d'], [90, '90 d']]} /></div>
      <${LineChart} data=${pain} labels=${dayLabels(n)} color="var(--viz-pain)" lo=${0} hi=${10} avg label=${`Pain over ${n} days, 0 to 10 scale`} />
      <p class="caption">Fixed 0–10 scale. Thick line = 7-day average.</p></section>
    <${Heatmap} />
    <section class="card glass"><div class="kicker">Sessions per week</div><${Bars} data=${wk} labels=${wk.map((_, i) => (i === 11 ? 'now' : `-${11 - i}w`))} label="Sessions per week, last 12 weeks" goal=${5} refLabel="goal 5" /></section>
  </div><div class="col">
    <section class="card glass"><div class="row between"><div class="kicker">Progression gate · 14 days</div><span class=${`tag ${g.ready ? 'good' : g.status === 'hold' ? 'warn' : ''}`}>${g.label}</span></div>
      <div class="list mt-3">
        <div><span class="grow t">Average pain ≤ 3</span><span class=${g.avgPain != null && g.avgPain <= 3 ? 'tag good' : 'tag'}>${g.avgPain ?? '—'}</span></div>
        <div><span class="grow t">8+ sessions</span><span class=${g.sessions >= 8 ? 'tag good' : 'tag'}>${g.sessions}</span></div>
        <div><span class="grow t">5+ check-ins (enough signal)</span><span class=${g.checkins >= 5 ? 'tag good' : 'tag'}>${g.checkins}</span></div>
      </div><p class="caption mt-2">Pain earns the next band level — the calendar never does.</p></section>
    ${ins.length > 0 && html`<section class="card glass"><div class="kicker mb-3">What your data says</div>${ins.map(i => html`<div class="row mb-3" style="align-items:flex-start"><span class="glyph"><${Icon} n=${i.icon} s=${20} /></span><div><div class="headline" style="font-size:15px;line-height:21px">${i.text}</div><div class="caption">n = ${i.n}${i.early ? ' · early signal' : ''} · association, not proof</div></div></div>`)}</section>`}
    <section class="card glass"><div class="kicker mb-3">What the coach has learned</div>
      ${helps.length + watch.length === 0 ? html`<p class="callout">It needs a check-in the day of a session and the morning after, twice per move. Keep logging.</p>` : html`<div class="list">
        ${helps.map(([id, v]) => html`<div><span class="tag good">Helps</span><span class="grow t">${lib().get(id)?.name || id}</span><span class="caption">${v.dAvg.toFixed(1)} next day</span></div>`)}
        ${watch.map(([id, v]) => html`<div><span class="tag warn">Watch</span><span class="grow t">${lib().get(id)?.name || id}</span><span class="caption">+${v.dAvg.toFixed(1)} next day</span></div>`)}</div>`}</section>
  </div></div>`;
}

function Health() {
  const q = route().query, S = state();
  const [msg, setMsg] = useState(null);
  const onFile = async e => { const f = e.target.files?.[0]; if (!f) return; try { const r = importHealth(await f.text()); setMsg(`Imported ${Object.keys(r.days).length} days${r.skipped ? `, skipped ${r.skipped} bad rows` : ''}.`); } catch (err) { setMsg('Could not import: ' + err.message); } };
  const importer = html`<section class="card glass"><div class="kicker">Sync with Muse · Health Connect</div>
    <p class="callout mt-2">Muse reads Google Fit / Samsung Health through Health Connect and hands you one file. Import it here — read-only, nothing leaves this device.</p>
    <label class="btn primary mt-3"><${Icon} n="sync" s=${18} /> Import sync file<input type="file" accept="application/json,.json" hidden onChange=${onFile} /></label>
    ${msg && html`<p class="caption mt-2">${msg}</p>`}
    ${S.health?.lastSyncAt && html`<p class="caption mt-2">Last sync ${new Date(S.health.lastSyncAt).toLocaleString()} · ${S.health.meta?.source || ''}</p>`}</section>`;
  if (!hasHealth()) return html`<div class="grid-2"><div class="col">${importer}</div><div class="col"><section class="card glass-thin"><p class="callout">No health data yet. Try <a href="#/you">demo data</a> to see this page full.</p></section></div></div>`;
  const N = 30, L = dayLabels(N);
  const rhr = series('restingHr', N), hrv = series('hrvMs', N), steps = series('steps', N);
  const band = a => { const m = mean(a), s = sd(a); return m != null && s != null ? [m - s, m + s] : null; };
  const sl = Array.from({ length: 14 }, (_, i) => { const d = healthDays()[addDays(dayStr(), i - 13)] || {}; return [d.sleepDeepMin || 0, d.sleepRemMin || 0, d.sleepLightMin || 0, d.sleepAwakeMin || 0].map(x => x / 60); });
  const z2w = Array.from({ length: 12 }, (_, w) => series('zone2Min', 7, addDays(dayStr(), -(11 - w) * 7)).reduce((a, b) => a + (b || 0), 0));
  const wo = Object.entries(healthDays()).flatMap(([d, r]) => (r.workouts || []).map(w => ({ d, ...w }))).sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 6);
  const focus = q.m;
  return html`<div class="grid-2"><div class="col">
    <section class="card glass" style=${focus === 'steps' ? 'outline:2px solid var(--viz-steps)' : ''}><div class="row between"><div class="kicker" style="color:var(--viz-steps)">Steps · 30 days</div><span class="caption">avg ${fmtNum(mean(steps))}</span></div><${Bars} data=${steps.map(v => v || 0)} colors=${['var(--viz-steps)']} labels=${L} label="Daily steps, 30 days" goal=${7000} refLabel="7k goal" /></section>
    <section class="card glass" style=${focus === 'sleep' ? 'outline:2px solid var(--viz-sl-rem)' : ''}><div class="kicker">Sleep stages · 14 nights</div><${Bars} data=${sl} colors=${['var(--viz-sl-deep)', 'var(--viz-sl-rem)', 'var(--viz-sl-light)', 'var(--viz-sl-awake)']} labels=${dayLabels(14)} label="Hours of deep, REM, light sleep and awake time per night" />
      <div class="legend"><span><i style="background:var(--viz-sl-deep)"></i>Deep</span><span><i style="background:var(--viz-sl-rem)"></i>REM</span><span><i style="background:var(--viz-sl-light)"></i>Light</span><span><i style="background:var(--viz-sl-awake)"></i>Awake</span></div></section>
    <section class="card glass"><div class="kicker" style="color:var(--viz-z2)">Zone 2 minutes per week</div><${Bars} data=${z2w} colors=${['var(--viz-z2)']} labels=${z2w.map((_, i) => (i === 11 ? 'now' : `-${11 - i}w`))} label="Zone 2 minutes per week" goal=${150} refLabel="150 min" /><p class="caption">Counts logged workouts in your Zone 2 band only — a floor, not a total.</p></section>
  </div><div class="col">
    <section class="card glass" style=${focus === 'rhr' ? 'outline:2px solid var(--viz-rhr)' : ''}><div class="kicker" style="color:var(--viz-rhr)">Resting heart rate · bpm</div><${LineChart} data=${rhr} labels=${L} color="var(--viz-rhr)" band=${band(rhr)} label="Resting heart rate, 30 days, with your normal range" /><p class="caption">Shaded = your 30-day normal range (mean ± 1 SD). Lower over time usually means fitter.</p></section>
    <section class="card glass" style=${focus === 'hrv' ? 'outline:2px solid var(--viz-hrv)' : ''}><div class="kicker" style="color:var(--viz-hrv)">Heart-rate variability · ms</div><${LineChart} data=${hrv} labels=${L} color="var(--viz-hrv)" band=${band(hrv)} label="HRV, 30 days, with your normal range" /><p class="caption">Below your range after a hard day or a short night is normal; it's a nudge, not a verdict.</p></section>
    ${wo.length > 0 && html`<section class="card glass"><div class="kicker mb-3">Recent workouts (Health Connect)</div><div class="list">${wo.map(w => html`<div><span class="glyph" style="color:var(--viz-z2)"><${Icon} n=${w.type.includes('BackForge') ? 'live' : 'z2'} s=${20} /></span><span class="grow"><span class="t">${w.type}</span><br/><span class="d">${new Date(w.d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${w.min} min${w.avgHr ? ` · avg ${w.avgHr} bpm` : ''}</span></span></div>`)}</div></section>`}
    ${importer}
  </div></div>`;
}

function Body() {
  const S = state(), N = 120;
  const w = series('weightKg', N), wl = dayLabels(N);
  let e = null; const ewma = w.map(v => (v == null ? e : (e = e == null ? v : e * 0.85 + v * 0.15)));
  const kcalIn = series('caloriesIn', 28), kcalOut = series('caloriesOut', 28);
  const bal = kcalIn.map((v, i) => (v != null && kcalOut[i] != null ? kcalOut[i] - v : null));
  const waist = (S.waist || []).slice(-16);
  const prot = Array.from({ length: 28 }, (_, i) => S.protein?.[addDays(dayStr(), i - 27)] ?? null);
  const floor = S.bodyweightKg ? Math.round(S.bodyweightKg * 1.6) : null;
  const first = w.find(v => v != null), last = [...w].reverse().find(v => v != null);
  return html`<div class="grid-2"><div class="col">
    <section class="card glass"><div class="row between"><div class="kicker" style="color:var(--viz-weight)">Weight · 120 days</div>${first != null && html`<span class="caption">${last.toFixed(1)} kg · ${(last - first > 0 ? '+' : '') + (last - first).toFixed(1)}</span>`}</div>
      ${w.some(v => v != null) ? html`<${LineChart} data=${w} trend=${ewma} labels=${wl} color="var(--viz-weight)" dots label="Weigh-ins over 120 days with smoothed trend" /><p class="caption">Dots = weigh-ins; line = smoothed trend.</p>` : html`<p class="callout">No weigh-ins synced yet.</p>`}</section>
    <section class="card glass"><div class="kicker">Energy balance · 28 days (kcal out − in)</div>${bal.some(v => v != null) ? html`<${Bars} data=${bal.map(v => Math.max(0, v || 0))} colors=${['var(--viz-weight)']} labels=${dayLabels(28)} label="Daily calorie deficit on days with food logged" /><p class="caption">Only days you logged food. Never zero-filled.</p>` : html`<p class="callout">No food logs synced.</p>`}</section>
  </div><div class="col">
    <section class="card glass"><div class="kicker">Waist · weekly (manual)</div>${waist.length > 1 ? html`<${LineChart} data=${waist.map(x => x.cm)} labels=${waist.map(x => new Date(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))} color="var(--viz-weight)" dots label="Waist in cm" />` : html`<p class="callout">Add one number a week in the classic Progress → Weight panel.</p>`}</section>
    <section class="card glass"><div class="row between"><div class="kicker">Protein · 28 days</div>${floor && html`<span class="caption">floor ${floor} g</span>`}</div>${prot.some(v => v != null) ? html`<${Bars} data=${prot.map(v => v || 0)} colors=${['var(--c-good)']} labels=${dayLabels(28)} goal=${floor} refLabel="1.6 g/kg" label="Protein grams per day" />` : html`<p class="callout">No protein logged.</p>`}</section>
  </div></div>`;
}

function Posture() {
  const S = state(), hist = S.assessHistory || [];
  return html`<div class="grid-2"><div class="col">
    <section class="card glass"><div class="kicker">Current findings</div>${S.results?.length ? html`<div class="list mt-3">${S.results.map(f => html`<div><span class=${`tag ${f.sev === 'high' ? 'att' : f.sev === 'mod' ? 'warn' : 'good'}`}>${f.sev === 'high' ? 'Priority' : f.sev === 'mod' ? 'Watch' : 'Clear'}</span><span class="grow"><span class="t">${f.t}</span>${f.fix && html`<br/><span class="d">In your plan: ${f.fix}</span>`}</span></div>`)}</div>` : html`<p class="callout mt-2">No assessment yet.</p>`}
      <a class="btn primary mt-4" href="#/you/checkups">Retake a check-up</a></section>
  </div><div class="col">
    <section class="card glass"><div class="kicker">Assessment history</div>${hist.length ? html`<div class="list mt-3">${[...hist].reverse().map(h => html`<div><span class="grow"><span class="t">${new Date(h.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span><br/><span class="d">${h.flags.length} finding${h.flags.length === 1 ? '' : 's'}: ${h.flags.slice(0, 3).join(', ')}${h.flags.length > 3 ? '…' : ''}</span></span></div>`)}</div>` : html`<p class="callout mt-2">Nothing yet.</p>`}
      <p class="caption mt-3">Band posture grades and photo checks live in the classic tools until they're rebuilt (see the roadmap).</p></section>
  </div></div>`;
}
