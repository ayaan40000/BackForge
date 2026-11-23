// Today: readiness → the one session + Start → posture cues → health strip → one nudge → week.
import { html, useState, useMemo } from '../../vendor/htm-preact.mjs';
import { Icon, glyphFor } from '../ui/icons.js';
import { Ring, Spark, PainScale, fmtNum } from '../ui/kit.js';
import { state, logCheckin, isDemo } from '../store.js';
import { ctx, lib, series, latest, lastNight, zone2Week, hasHealth, mean, lastOf } from '../data.js';
import { readiness, streak, energyFor, READINESS_WORD } from '../engine/progress.js';
import { sessionExercises, flareActive, weekPlan } from '../engine/plan.js';
import { prepare, resumable } from '../live/session.js';
import { dayStr, addDays, weekday } from '../engine/dates.js';
import { go } from '../router.js';

const STATE = { full: ['Ready', 'var(--c-good)'], trimmed: ['Steady', 'var(--c-info)'], micro: ['Easy', 'var(--c-warn)'], relief: ['Relief', 'var(--c-calm)'] };
const CUES = [
  ['Ribs stacked over pelvis while you stand', 'apt'], ['Soft glute squeeze when you stand up', 'apt'], ['Chin back, eyes level at the screen', 'head'],
  ['Shoulders down, away from your ears', 'head'], ['Cooking or standing over ~2 h? Sit early', 'apt'], ['Exhale fully — let the ribs drop', 'apt'],
];

export function Today() {
  const S = state(), c = ctx(), r = readiness(c), ck = c.todaysCheckin();
  const st = streak(c);
  const [detail, setDetail] = useState(false);
  const opts = useMemo(() => ({ mins: S.livePrefs?.mins || 20, energy: energyFor(r), caveats: [] }), [r?.level, S.livePrefs?.mins]);
  const preview = useMemo(() => prepare(opts), [opts, S.log.length, S.checkins.length]);
  const plan = sessionExercises(lib(), c);
  const relief = flareActive(c) || r?.level === 'relief';
  const resume = resumable();
  const name = (S.profile?.displayName || S.profile?.name || '').split(' ')[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const moves = preview.tl.units;
  const [sw, col] = r ? STATE[r.level] : ['Check in', 'var(--c-ink-3)'];

  return html`
  <header class="screen-head">
    <div><div class="sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${name ? `${hello}, ${name}` : 'Today'}</h1></div>
    <a class="avatar" href="#/you" aria-label="You">${(name || 'B')[0]}</a>
  </header>
  ${isDemo() && html`<div class="banner demo"><${Icon} n="spark" s=${18} /> Demo data — 120 days of example history. Your real data is untouched. <a href="#/you" style="margin-left:auto">Exit</a></div>`}
  <div class="grid-today">
    <div class="col">
      <section class="card glass lens" aria-label="Readiness">
        ${ck || r ? html`<div class="row" style="gap:20px;align-items:center">
          <${Ring} value=${r?.score || 0} color=${col} label=${`Readiness ${r?.score} of 100, ${sw}`}><b>${r?.score ?? '–'}</b><small>${sw}</small></${Ring}>
          <div style="min-width:0">
            <div class="kicker">Readiness${r?.stale ? ' · last check-in' : ''}</div>
            <div class="title2" style="margin:2px 0 6px">${READINESS_WORD[r.level]}</div>
            <div class="chips">${r.drivers.slice(0, 3).map(d => html`<span class="chip sm" title=${d.text}>${d.text.split(' (')[0]}${d.pts ? html`<b style=${`color:${d.pts > 0 ? 'var(--c-good)' : 'var(--c-warn)'}`}>${d.pts > 0 ? '+' : ''}${d.pts}</b>` : ''}</span>`)}</div>
          </div></div>
          ${r.drivers.length > 3 && html`<details class="more mt-2"><summary>Why ${r.score}?</summary><ul class="callout" style="padding-left:18px">${r.drivers.map(d => html`<li>${d.text}${d.pts != null ? ` (${d.pts > 0 ? '+' : ''}${d.pts})` : ''}</li>`)}</ul></details>`}`
        : html`<div class="kicker mb-2">Morning check-in</div><div class="headline mb-3">How's the back? 0–10</div>
          <${PainScale} value=${null} onPick=${p => logCheckin({ pain: p, sleep: (lastNight()?.sleepMin ?? 420) < 360 ? 'poor' : (lastNight()?.sleepMin ?? 420) >= 450 ? 'great' : 'ok', where: 'back' })} />
          <p class="caption mt-2">One tap saves it. Sleep comes from your synced data when you have it.</p>`}
      </section>

      ${resume && html`<section class="card glass row between"><div><div class="kicker">Paused session</div><div class="headline">Resume at ${resume.exName || 'your session'} · ${Math.round((resume.total - resume.elapsed) / 60)} min left</div></div><button class="btn primary" onClick=${() => go('/live/play?resume=1')}>Resume</button></section>`}

      <section class="card glass" style="view-transition-name:vt-session-hero" aria-label="Today's session">
        <div class="kicker">${relief ? 'Relief day' : `Today · ${plan.kind === 'strength' ? plan.title.split(' — ')[0] : plan.kind === 'cardio' ? 'Zone 2 day + strength sampler' : 'Foundation day'}`}</div>
        <div class="title2 mt-2">${relief ? `Relief session · ${Math.round(preview.tl.totalSec / 60)} min` : preview.workout.title.replace(/^\d+-minute /, '').replace(/^./, m => m.toUpperCase())}</div>
        <div class="callout mt-2">${Math.round(preview.tl.totalSec / 60)} min · ${moves.length} moves · voice-coached</div>
        <div class="row mt-4" style="gap:8px">${moves.slice(0, 4).map(u => html`<span class="glyph" title=${u.name}><${Icon} n=${glyphFor(lib().get(u.id))} s=${22} /></span>`)}${moves.length > 4 && html`<span class="caption">+${moves.length - 4}</span>`}</div>
        <button class=${`btn big mt-4 ${relief ? 'calm' : 'primary'}`} style="view-transition-name:vt-start" onClick=${() => go(`/live/play?mins=${opts.mins}&energy=${opts.energy}`)}><${Icon} n="play" fill /> Start · ${opts.mins} min</button>
        <div class="row between mt-2"><a class="btn text" href="#/live">Change time or adjust</a><button class="btn text" onClick=${() => setDetail(!detail)} aria-expanded=${detail}>${detail ? 'Hide' : 'See'} moves</button></div>
        ${detail && html`<div class="list mt-2">${moves.map(u => html`<a href=${`#/moves/${u.id}`}><span class="glyph"><${Icon} n=${glyphFor(lib().get(u.id))} s=${20} /></span><span class="grow"><span class="t">${u.name}</span><br/><span class="d">${u.dose} · ${u.sets} set${u.sets > 1 ? 's' : ''}</span></span><span class="tag">${u.section}</span></a>`)}</div>`}
      </section>
      <${Cues} />
    </div>

    <div class="col">
      <${HealthStrip} />
      <${Nudge} r=${r} />
    </div>

    <div class="col">
      <section class="card glass" aria-label="This week">
        <div class="row between"><div class="kicker">This week</div><span class="tag" style="color:var(--c-reward)"><${Icon} n="flame" s=${14} /> ${st}-day streak</span></div>
        <${WeekDots} />
      </section>
      ${preview.workout.reasons?.length > 0 && html`<section class="card glass-thin"><div class="kicker mb-2">Why this session</div><ul class="callout" style="padding-left:18px;display:grid;gap:4px">${preview.workout.reasons.slice(0, 4).map(x => html`<li>${x}</li>`)}</ul></section>`}
    </div>
  </div>`;
}

function WeekDots() {
  const S = state(), t = dayStr(), mon = addDays(t, -weekday(t)), done = new Set(S.log.map(l => l.date));
  const wp = weekPlan();
  return html`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px">${wp.map((w, i) => {
    const d = addDays(mon, i), on = done.has(d), today = d === t;
    return html`<div style="display:grid;justify-items:center;gap:6px"><span class="caption" style=${today ? 'color:var(--c-ink);font-weight:700' : ''}>${w.day[0]}</span>
      <span style=${`width:34px;height:34px;border-radius:50%;display:grid;place-items:center;${on ? 'background:var(--c-accent);color:var(--c-on-accent)' : `box-shadow:inset 0 0 0 ${today ? 2 : 1}px ${today ? 'var(--c-accent)' : 'var(--c-line)'}`}`} title=${w.label}>${on ? html`<${Icon} n="check" s=${18} />` : html`<span class="caption">${w.kind === 'cardio' ? 'Z2' : w.kind === 'rest' ? '·' : w.kind}</span>`}</span></div>`;
  })}</div>`;
}

function Cues() {
  const S = state(); const key = 'cues_' + dayStr();
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem('bf_' + key)) || []; } catch { return []; } });
  const toggle = i => { const n = done.includes(i) ? done.filter(x => x !== i) : [...done, i]; setDone(n); try { localStorage.setItem('bf_' + key, JSON.stringify(n)); } catch {} };
  const pick = [0, 2, 4, 5];
  return html`<section class="card glass" aria-label="Posture cues"><div class="row between"><div class="kicker">Posture cues today</div><span class="caption">${done.length}/${pick.length} caught</span></div>
    <div class="list mt-3">${pick.map(i => html`<button role="checkbox" aria-checked=${done.includes(i)} onClick=${() => toggle(i)}>
      <span class="glyph" style=${done.includes(i) ? 'background:var(--c-accent);color:var(--c-on-accent)' : ''}><${Icon} n=${done.includes(i) ? 'check' : CUES[i][1] === 'head' ? 'you' : 'core'} s=${20} /></span>
      <span class="grow t" style=${done.includes(i) ? 'color:var(--c-ink-3)' : ''}>${CUES[i][0]}</span></button>`)}</div></section>`;
}

function HealthStrip() {
  if (!hasHealth()) return html`<section class="card glass"><div class="kicker">Health</div><div class="headline mt-2">Connect your health data</div><p class="callout mt-2">Steps, sleep, resting heart rate, HRV and weight from Google Fit / Samsung Health arrive through Muse's Health Connect sync.</p><div class="row mt-4 wrap"><a class="btn primary" href="#/progress/health">Import a sync file</a><a class="btn ghost" href="#/you">Preview with demo data</a></div></section>`;
  const steps = series('steps', 14), rhr = series('restingHr', 30), hrv = series('hrvMs', 30), wt = series('weightKg', 60);
  const night = lastNight(), ys = latest('steps', 2), r1 = latest('restingHr', 3), h1 = latest('hrvMs', 3), w1 = lastOf('weightKg');
  const z2 = zone2Week();
  const d = (v, base, inv) => { if (v == null || base == null) return null; const x = v - base; return { x, cls: Math.abs(x) < 0.5 ? '' : (x > 0) !== !!inv ? 'up' : 'down' }; };
  const rhrD = d(r1?.v, mean(rhr.slice(0, -1)), true), hrvD = d(h1?.v, mean(hrv.slice(0, -1)));
  const stages = night ? [['deep', night.sleepDeepMin], ['rem', night.sleepRemMin], ['light', night.sleepLightMin], ['awake', night.sleepAwakeMin]].filter(x => x[1]) : [];
  const tot = stages.reduce((a, b) => a + b[1], 0);
  const wOld = wt.find(v => v != null);
  return html`<section aria-label="Health"><div class="row between mb-3"><div class="kicker">Health · Health Connect</div><a class="caption" href="#/progress/health">All health <${Icon} n="chevron" s=${12} /></a></div>
  <div class="bento six">
    <a class="tile glass" href="#/progress/health?m=steps"><span class="k" style="color:var(--viz-steps)"><${Icon} n="steps" s=${16} /> Steps</span><span class="v">${fmtNum(ys?.v)}</span><span class="delta">7-day avg ${fmtNum(mean(steps.slice(-7)))}</span><${Spark} data=${steps} color="var(--viz-steps)" /></a>
    <a class="tile glass" href="#/progress/health?m=sleep"><span class="k" style="color:var(--viz-sl-rem)"><${Icon} n="moon" s=${16} /> Sleep</span><span class="v">${night ? `${Math.floor(night.sleepMin / 60)}h ${String(night.sleepMin % 60).padStart(2, '0')}` : '—'}</span>
      ${tot > 0 && html`<span style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-top:auto" role="img" aria-label="Sleep stages">${stages.map(([k, v]) => html`<i style=${`flex:${v};background:var(--viz-sl-${k})`}></i>`)}</span>`}
      <span class="delta">${night?.sleepScore ? `Score ${night.sleepScore}` : ''}${night?.sleepDeepMin ? ` · deep ${night.sleepDeepMin}m` : ''}</span></a>
    <a class="tile glass" href="#/progress/health?m=rhr"><span class="k" style="color:var(--viz-rhr)"><${Icon} n="heart" s=${16} /> Resting HR</span><span class="v">${r1?.v ?? '—'}<small>bpm</small></span><span class=${`delta ${rhrD?.cls || ''}`}>${rhrD ? `${rhrD.x > 0 ? '+' : ''}${rhrD.x.toFixed(0)} vs 30-day` : 'no baseline yet'}</span><${Spark} data=${rhr} color="var(--viz-rhr)" /></a>
    <a class="tile glass" href="#/progress/health?m=hrv"><span class="k" style="color:var(--viz-hrv)"><${Icon} n="hrv" s=${16} /> HRV</span><span class="v">${h1?.v ?? '—'}<small>ms</small></span><span class=${`delta ${hrvD?.cls || ''}`}>${hrvD ? `${hrvD.x > 0 ? '+' : ''}${hrvD.x.toFixed(0)} vs 30-day` : 'no baseline yet'}</span><${Spark} data=${hrv} color="var(--viz-hrv)" /></a>
    <a class="tile glass" href="#/progress/health?m=z2"><span class="k" style="color:var(--viz-z2)"><${Icon} n="z2" s=${16} /> Zone 2</span><span class="v">${z2}<small>/ 150 min</small></span>
      <span style="height:8px;border-radius:4px;background:var(--c-surface-2);margin-top:auto;overflow:hidden"><i style=${`display:block;height:100%;width:${Math.min(100, z2 / 1.5)}%;background:var(--viz-z2)`}></i></span><span class="delta">last 7 days</span></a>
    <a class="tile glass" href="#/progress/body"><span class="k" style="color:var(--viz-weight)"><${Icon} n="scale" s=${16} /> Weight</span><span class="v">${w1 ? w1.v.toFixed(1) : '—'}<small>kg</small></span><span class="delta">${w1 && wOld ? `${(w1.v - wOld).toFixed(1)} kg in 8 weeks` : w1 ? `${w1.ago} d ago` : 'no weigh-ins'}</span><${Spark} data=${wt} color="var(--viz-weight)" /></a>
  </div></section>`;
}

function Nudge({ r }) {
  const S = state(), c = ctx();
  let n = null;
  if (r?.level === 'relief') n = ['calm', 'Flare rules are on', 'Relief work only today — it still protects your streak.', null];
  else if (!S.results?.length) n = ['info', 'Take the movement check-up', '13 quick tests make every session yours.', ['Start check-up', '#/you/checkups']];
  else if (S.backup?.lastExportAt && (Date.now() - new Date(S.backup.lastExportAt)) / 864e5 > 7) n = ['info', 'Weekly backup is due', 'One tap exports your data to where you keep backups.', ['Back up', '#/you']];
  else if (!c.todaysCheckin()) n = ['info', 'No check-in yet today', 'A pain score keeps the plan honest.', null];
  if (!n) return null;
  return html`<section class="card glass-thin row" style="align-items:flex-start"><span class="glyph" style=${`color:var(--c-${n[0]})`}><${Icon} n="info" s=${20} /></span><div class="grow"><div class="headline">${n[1]}</div><div class="callout">${n[2]}</div>${n[3] && html`<a class="btn text" style="padding:0" href=${n[3][1]}>${n[3][0]} →</a>`}</div></section>`;
}
