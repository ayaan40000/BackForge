// Live: setup (≤ 3 decisions, all pre-filled) → full-screen real-time player → finish.
import { html, useState, useEffect, useMemo, useRef } from '../../vendor/htm-preact.mjs';
import { Icon, glyphFor } from '../ui/icons.js';
import { Seg, Sheet, PainScale, fmtTime } from '../ui/kit.js';
import { state, uiPrefs, setUi } from '../store.js';
import { ctx, lib } from '../data.js';
import { readiness, energyFor, streak } from '../engine/progress.js';
import { flareActive } from '../engine/plan.js';
import { CAVEATS } from '../engine/live.js';
import * as live from '../live/session.js';
import { go, route } from '../router.js';

const DURS = [5, 10, 15, 20, 30, 45, 60];
const PHASE = { warm: 'var(--c-phase-warm)', main: 'var(--c-phase-main)', cool: 'var(--c-phase-cool)', rest: 'var(--c-phase-rest)' };
const phaseOf = s => (s.type === 'rest' || s.type === 'switch' ? 'rest' : s.section || (s.type === 'outro' ? 'cool' : 'warm'));

export function LiveSetup() {
  const S = state(), c = ctx(), r = readiness(c), flare = flareActive(c);
  const [mins, setMins] = useState(S.livePrefs?.mins || 20);
  const [energy, setEnergy] = useState(energyFor(r) === 'flare' ? 'low' : energyFor(r));
  const [cav, setCav] = useState(S.livePrefs?.caveats || []);
  const [variant, setVariant] = useState('standard');
  const [open, setOpen] = useState(false);
  const [relief, setRelief] = useState(flare);
  const opts = { mins, energy: relief ? 'flare' : energy, caveats: cav, variant };
  const { workout, tl } = useMemo(() => live.prepare(opts), [mins, energy, cav.join(), variant, relief]);
  const voiceOn = uiPrefs().voice !== false;
  const phaseMin = k => Math.round(tl.segments.filter(s => s.section === k || (k === 'warm' && s.type === 'intro') || (k === 'cool' && s.type === 'outro')).reduce((a, s) => a + s.sec, 0) / 60);
  const startUrl = `/live/play?mins=${mins}&energy=${opts.energy}&cav=${cav.join(',')}&variant=${variant}`;

  return html`
  <header class="screen-head"><div><div class="sub">Voice-coached, real time</div><h1>Live</h1></div></header>
  <div class="grid-2">
    <div class="col">
      ${relief ? html`<section class="card glass" style="box-shadow:var(--g-border),var(--g-rim),0 0 0 1px color-mix(in oklch,var(--c-calm) 40%,transparent)">
        <div class="kicker" style="color:var(--c-calm)">Relief day</div><div class="title2 mt-2">Gentle relief session</div>
        <p class="callout mt-2">${flare ? 'Pain is 7 or higher today, so Live runs the relief protocol only: slow, unloaded moves. It still counts for your streak.' : 'Relief protocol only: slow, unloaded moves.'}</p>
        ${!flare && html`<button class="btn text" style="padding:0" onClick=${() => setRelief(false)}>Back to a normal session</button>`}</section>`
      : html`<section class="card glass" aria-label="How long">
        <div class="kicker mb-3">1 · How long have you got?</div>
        <div class="chips" role="radiogroup" aria-label="Duration">${DURS.map(d => html`<button class="chip" role="radio" aria-checked=${mins === d} onClick=${() => setMins(d)}>${d} min</button>`)}</div>
        <label class="row mt-4" style="gap:14px"><span class="caption" style="width:56px">Custom</span><input type="range" min="5" max="60" step="5" value=${mins} onInput=${e => setMins(+e.target.value)} aria-label="Custom duration in minutes" /><b class="no-wrap" style="min-width:64px;text-align:right">${mins} min</b></label>
      </section>
      <section class="card glass" aria-label="Energy">
        <div class="kicker mb-3">2 · How's your energy?</div>
        <${Seg} label="Energy" value=${energy} onChange=${setEnergy} options=${[['low', 'Low'], ['ok', 'Okay'], ['great', 'Good']]} />
        ${r && html`<p class="caption mt-2">Pre-set from readiness ${r.score}.</p>`}
      </section>
      <section class="card glass" aria-label="Adjust">
        <button class="row between w-full" onClick=${() => setOpen(!open)} aria-expanded=${open}><span><span class="kicker">3 · Adjust</span><br/><span class="headline">${cav.length ? CAVEATS.filter(([k]) => cav.includes(k)).map(x => x[1]).join(', ') : 'No changes'}</span></span><${Icon} n="chevdown" /></button>
        ${open && html`<div class="chips mt-3">${CAVEATS.map(([k, l]) => html`<button class="chip" aria-pressed=${cav.includes(k)} onClick=${() => setCav(cav.includes(k) ? cav.filter(x => x !== k) : [...cav, k])}>${l}</button>`)}
          <button class="chip" aria-pressed=${variant === 'desk'} onClick=${() => setVariant(variant === 'desk' ? 'standard' : 'desk')}>Desk-day reset</button></div>
          <button class="btn text mt-2" style="padding:0;color:var(--c-calm)" onClick=${() => setRelief(true)}>I'm in a flare — relief only</button>`}
      </section>`}
    </div>

    <div class="col">
      <section class="card glass" aria-label="Session preview">
        <div class="row between"><div><div class="kicker">Your session</div><div class="title2">${fmtTime(tl.totalSec)}</div></div><span class="caption">${tl.units.length} moves</span></div>
        <${TimelineBar} tl=${tl} />
        <div class="legend mt-2"><span><i style="background:var(--c-phase-warm)"></i>Warm-up ${phaseMin('warm')}</span><span><i style="background:var(--c-phase-main)"></i>Main ${phaseMin('main')}</span><span><i style="background:var(--c-phase-cool)"></i>Cool-down ${phaseMin('cool')}</span><span><i style="background:var(--c-phase-rest)"></i>Rest</span></div>
        <div class="list mt-4">${tl.units.map(u => html`<a href=${`#/moves/${u.id}`}><span class="glyph"><${Icon} n=${glyphFor(lib().get(u.id))} s=${20} /></span><span class="grow"><span class="t">${u.name}</span><br/><span class="d">${u.dose}${u.sets !== +(/(\d+)\s*×/.exec(u.dose)?.[1] || 1) ? ` · ${u.sets} sets today` : ''}</span></span><span class="tag" style=${`color:${PHASE[u.section]}`}>${u.section}</span></a>`)}</div>
        <details class="more mt-3"><summary>Why this workout?</summary><ul class="callout" style="padding-left:18px;display:grid;gap:4px">${workout.reasons.map(x => html`<li>${x}</li>`)}</ul></details>
      </section>
      <div class="sticky-start">
        <button class=${`btn big ${relief ? 'calm' : 'primary'}`} style="view-transition-name:vt-start" onClick=${() => go(startUrl)}><${Icon} n="play" fill /> Start ${fmtTime(tl.totalSec)}</button>
        <button class="icon-btn glass" style="width:56px;height:56px;flex:none" aria-pressed=${voiceOn} aria-label=${voiceOn ? 'Voice coach on' : 'Voice coach off'} onClick=${() => setUi({ voice: !voiceOn })}><${Icon} n=${voiceOn ? 'voice' : 'voiceoff'} /></button>
      </div>
      <p class="caption">Keep the screen on for voice. Headphone buttons pause and skip.</p>
    </div>
  </div>`;
}

export function TimelineBar({ tl, elapsed = null, onSeek }) {
  const ref = useRef();
  const seek = e => { if (!onSeek) return; const b = ref.current.getBoundingClientRect(); const t = ((e.clientX - b.left) / b.width) * tl.totalSec; const seg = [...tl.segments].reverse().find(s => s.start <= t) || tl.segments[0]; onSeek(seg.start + 0.01); };
  return html`<div class="tlbar" ref=${ref} onClick=${seek} role=${onSeek ? 'slider' : 'img'} aria-label="Session timeline" aria-valuemin="0" aria-valuemax=${Math.round(tl.totalSec)} aria-valuenow=${elapsed != null ? Math.round(elapsed) : undefined}>
    ${tl.segments.map(s => html`<i style=${`flex:${s.sec};background:${PHASE[phaseOf(s)]};opacity:${s.type === 'work' ? 1 : s.type === 'rest' || s.type === 'switch' ? .45 : .25}`} data-done=${elapsed != null && s.start + s.sec <= elapsed}></i>`)}
    ${elapsed != null && html`<b class="playhead" style=${`left:${(elapsed / tl.totalSec) * 100}%`}></b>`}</div>`;
}

export function LivePlayer() {
  const q = route().query;
  const [, force] = useState(0);
  const [sheet, setSheet] = useState(null);   // 'pain' | 'exit' | 'redflag'
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    if (!live.active()) {
      const r = q.resume && live.resumable();
      const opts = r ? r.opts : { mins: +q.mins || 20, energy: q.energy || 'ok', caveats: q.cav ? q.cav.split(',').filter(Boolean) : [], variant: q.variant || 'standard' };
      live.start(opts, { resumeAt: r ? r.elapsed : 0 });
    }
    document.documentElement.dataset.player = '';
    const off = live.onSession(() => force(x => x + 1));
    return () => { off(); delete document.documentElement.dataset.player; };
  }, []);
  useEffect(() => {
    const k = e => {
      if (e.target.closest('input,textarea') || sheet || summary) return;
      const m = { ' ': live.toggle, ArrowRight: live.next, ArrowLeft: live.back, e: live.easier, r: live.extend, v: live.toggleVoice, p: () => setSheet('pain'), Escape: () => setSheet('exit') }[e.key];
      if (m) { e.preventDefault(); m(); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [sheet, summary]);

  if (summary) return html`<${Finish} summary=${summary} />`;
  const snap = live.snapshot();
  if (!snap) return html`<div class="empty">Loading…</div>`;
  const { seg, pos, elapsed, total, running, done, caption, next, tl } = snap;
  if (done && !sheet) setTimeout(() => setSheet('finish'), 0);
  const phase = phaseOf(seg);
  const prog = seg.sec ? pos.into / seg.sec : 0;
  const isRest = seg.type === 'rest' || seg.type === 'switch';
  const big = Math.ceil(pos.left);
  const reps = seg.type === 'work' && seg.reps && !seg.holdSec ? Math.min(seg.reps, Math.floor(pos.into / (seg.sec / seg.reps)) + 1) : null;
  const sub = seg.type === 'work' ? (seg.holdSec ? 'hold' : `rep ${reps} of ${seg.reps}`) : seg.type === 'rest' ? 'rest' : seg.type === 'switch' ? 'switch sides' : seg.type === 'prep' ? 'get ready' : seg.type === 'intro' ? 'starting' : 'cool-down';
  const title = seg.name || (seg.type === 'intro' ? 'Getting started' : seg.type === 'outro' ? 'Wind down' : '');
  const line2 = seg.set ? `Set ${seg.set} of ${seg.sets}${seg.side ? ` · ${seg.side[0].toUpperCase() + seg.side.slice(1)} side` : ''}` : seg.type === 'outro' ? 'Breathe and settle' : `${tl.units.length} moves · ${fmtTime(total)}`;
  const voiceOn = uiPrefs().voice !== false;
  const R = 46, C = 2 * Math.PI * R;
  const finish = (pain, leg) => { const s = live.finish({ pain, leg }); setSheet(null); setSummary({ ...s, pain, before: ctx().checkins.at(-1)?.pain }); };

  return html`<div class="player" data-phase=${phase} data-running=${running} style=${`--phase:${PHASE[phase]}`}>
    <div class="player-bg" aria-hidden="true"></div>
    <header class="player-top">
      <button class="icon-btn glass-thin" aria-label="End session" onClick=${() => { if (running) live.toggle(); setSheet('exit'); }}><${Icon} n="close" /></button>
      <div class="caption" style="color:var(--c-ink-2)">${phase === 'rest' ? 'Recover' : phase === 'main' ? 'Main work' : phase === 'cool' ? 'Cool-down' : 'Warm-up'}${seg.exIndex != null ? ` · ${seg.exIndex + 1} of ${seg.exCount}` : ''}</div>
      <div class="player-left" aria-label="Time remaining">${fmtTime(total - elapsed)}</div>
    </header>

    <div class="player-body">
      <div class="player-ring" style="view-transition-name:vt-start">
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r=${R} /><circle class="val" cx="50" cy="50" r=${R} stroke-dasharray=${C} stroke-dashoffset=${isRest ? C * (1 - prog) : C * prog} /></svg>
        <div class="mid"><b class=${pos.left <= 3.05 && pos.left > 0 ? 'pop' : ''} key=${big <= 3 ? big : 'n'} aria-hidden="true">${seg.holdSec || isRest || seg.type === 'prep' || seg.type === 'intro' || big < 60 ? big : fmtTime(pos.left)}</b><small>${sub}</small></div>
      </div>
      <div class="player-info">
        <h1 class="player-name" key=${seg.i + 'n'}>${title}</h1>
        <div class="player-line2">${line2}${snap.regressed ? html` · <span class="tag calm">Easier version</span>` : ''}</div>
        ${snap.regressed && seg.regression && html`<div class="callout">${seg.regression}</div>`}
        <p class="player-caption" aria-live="polite" id="live-caption">${uiPrefs().captions !== false ? caption : ''}</p>
        ${next && html`<div class="next glass">
          <span class="glyph"><${Icon} n=${glyphFor(lib().get(next.exId))} s=${20} /></span>
          <span class="grow"><span class="caption">Next${next.exId === seg.exId ? '' : ''}</span><br/><b>${next.name}${next.side ? ` · ${next.side[0].toUpperCase()}` : ''}${next.exId === seg.exId && next.set ? ` · set ${next.set}` : ''}</b></span>
          <span class="caption">in ${fmtTime(next.start - elapsed)}</span></div>`}
        <ol class="player-list">${tl.units.map((u, i) => html`<li data-on=${seg.exIndex === i} data-done=${seg.exIndex != null && i < seg.exIndex}>${u.name}</li>`)}</ol>
      </div>
    </div>

    <footer class="player-foot">
      <${TimelineBar} tl=${tl} elapsed=${elapsed} onSeek=${t => { const p = live.active().player; p.seekTo(t); }} />
      <div class="player-controls glass">
        <button class="icon-btn" aria-label="Back" onClick=${live.back}><${Icon} n="back" s=${26} /></button>
        <button class="play" aria-label=${running ? 'Pause' : 'Play'} onClick=${live.toggle}><${Icon} n=${running ? 'pause' : 'play'} s=${34} fill=${!running} /></button>
        <button class="icon-btn" aria-label="Skip" onClick=${live.next}><${Icon} n="skip" s=${26} /></button>
      </div>
      <div class="player-chips">
        <button class="chip sm glass-thin" onClick=${live.easier} disabled=${!seg.exId} aria-keyshortcuts="E"><${Icon} n="easier" s=${16} /> Easier</button>
        <button class="chip sm glass-thin" onClick=${live.extend} disabled=${!(isRest || seg.type === 'prep')} aria-keyshortcuts="R"><${Icon} n="plus" s=${16} /> 15 s</button>
        <button class="chip sm glass-thin" onClick=${live.toggleVoice} aria-pressed=${voiceOn} aria-keyshortcuts="V"><${Icon} n=${voiceOn ? 'voice' : 'voiceoff'} s=${16} /> Voice</button>
        <button class="chip sm glass-thin" onClick=${live.toggleBed} aria-pressed=${!!uiPrefs().bed}><${Icon} n="spark" s=${16} /> Music</button>
        <button class="chip sm pain-chip" onClick=${() => { if (running) live.toggle(); setSheet('pain'); }} aria-keyshortcuts="P"><${Icon} n="pain" s=${16} /> Pain</button>
      </div>
    </footer>

    <${Sheet} open=${sheet === 'pain'} onClose=${() => setSheet(null)} label="What are you feeling?">
      <h2 class="title2">What are you feeling?</h2><p class="callout mt-2">Your answer changes the session, not your streak.</p>
      <div class="list mt-4">
        <button onClick=${() => { live.painReport('sharp'); setSheet(null); }}><span class="glyph" style="color:var(--c-attention)"><${Icon} n="pain" /></span><span class="grow"><span class="t">Sharp, or anything down the leg</span><br/><span class="d">Stops this move and moves on</span></span></button>
        <button onClick=${() => { live.painReport('achy'); setSheet(null); }}><span class="glyph"><${Icon} n="check" /></span><span class="grow"><span class="t">Achy but OK</span><br/><span class="d">Noted. Carry on — Easier is one tap away</span></span></button>
        <button onClick=${() => { live.painReport('redflag'); setSheet('redflag'); }}><span class="glyph" style="color:var(--c-bad)"><${Icon} n="info" /></span><span class="grow"><span class="t">Numbness, weakness, or bladder/bowel changes</span><br/><span class="d">Stops the session</span></span></button>
      </div></${Sheet}>
    <${Sheet} open=${sheet === 'redflag'} onClose=${() => setSheet(null)} label="Stop and get checked">
      <h2 class="title2" style="color:var(--c-bad)">Stop the session</h2>
      <p class="callout mt-2">New numbness in the groin or saddle area, leg weakness, or changes in bladder or bowel control need urgent medical care — contact emergency services or go to urgent care now. BackForge screens and trains; it does not diagnose.</p>
      <button class="btn big ghost mt-4" onClick=${() => { live.end(); go('/today'); }}>End session</button></${Sheet}>
    <${Sheet} open=${sheet === 'exit'} onClose=${() => setSheet(null)} label="Paused">
      <h2 class="title2">Paused</h2><p class="callout mt-2">${fmtTime(elapsed)} done · ${fmtTime(total - elapsed)} to go. Everything you finished still counts.</p>
      <div class="stack mt-4"><button class="btn big primary" onClick=${() => { setSheet(null); live.toggle(); }}>Keep going</button>
      <button class="btn big ghost" onClick=${() => setSheet('finish')}>Finish early and log it</button>
      <button class="btn text w-full" onClick=${() => { live.end(); go('/today'); }}>Discard session</button></div></${Sheet}>
    <${Sheet} open=${sheet === 'finish'} onClose=${() => {}} label="Log your session">
      <${LogPain} onSave=${finish} /></${Sheet}>
  </div>`;
}

function LogPain({ onSave }) {
  const before = ctx().todaysCheckin()?.pain;
  const [p, setP] = useState(null), [leg, setLeg] = useState(null);
  return html`<div class="kicker" style="color:var(--c-reward)">Session done</div><h2 class="title2 mt-2">How's your back now?</h2>
    <p class="callout mt-2 mb-3">${before != null ? `You started at ${before}/10.` : 'Pain from 0 to 10.'}${p != null && before != null ? ` ${p < before ? `${before - p} point${before - p > 1 ? 's' : ''} lower than when you started.` : p > before ? `${p - before} higher — that's useful information for tomorrow.` : 'Same as when you started.'}` : ''}</p>
    <${PainScale} value=${p} onPick=${setP} marker=${before} />
    <div class="row mt-4 between"><span class="headline">Any leg symptoms?</span><div class="chips"><button class="chip" aria-pressed=${leg === false} onClick=${() => setLeg(false)}>No</button><button class="chip" aria-pressed=${leg === true} onClick=${() => setLeg(true)}>Yes</button></div></div>
    <button class="btn big primary mt-6" onClick=${() => onSave(p, leg)}>Save session</button>
    <button class="btn text w-full" onClick=${() => onSave(null, null)}>Skip the score</button>`;
}

function Finish({ summary }) {
  const st = streak(ctx());
  useEffect(() => { document.documentElement.dataset.mood = 'celebrate'; return () => { delete document.documentElement.dataset.mood; }; }, []);
  return html`<div class="finish">
    <div class="finish-check" aria-hidden="true"><${Icon} n="check" s=${64} /></div>
    <h1 class="title2" style="font-size:30px;line-height:36px">Session done.</h1>
    <p class="callout">${summary.moves} moves in ${summary.mins} minutes${summary.regressions ? `, with ${summary.regressions} smart swap${summary.regressions > 1 ? 's' : ''} to the easier version` : ''}.</p>
    <div class="bento mt-4" style="width:100%;max-width:520px">
      <div class="tile glass"><span class="k">Streak</span><span class="v" style="color:var(--c-reward)">${st}<small>days</small></span></div>
      <div class="tile glass"><span class="k">Pain now</span><span class="v">${summary.pain ?? '—'}<small>/10</small></span>${summary.pain != null && summary.before != null && html`<span class="delta">${summary.before} before</span>`}</div>
    </div>
    <p class="caption mt-4" style="max-width:420px;text-align:center">“We are what we repeatedly do.” — Will Durant, summarising Aristotle</p>
    <a class="btn big primary mt-4" style="max-width:420px" href="#/today">Back to Today</a>
  </div>`;
}
