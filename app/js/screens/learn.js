// Learn: the tutorial (lessons from data/tutorial.json), the "?" help button, and the first-run welcome.
import { html, useState, useEffect } from '../../vendor/htm-preact.mjs';
import { Icon } from '../ui/icons.js';
import { Sheet } from '../ui/kit.js';
import { state, update, isDemo } from '../store.js';
import { BASE } from '../data.js';
import { route } from '../router.js';
import { KitScreen } from './kit.js';

let DOC = null; const subs = new Set();
fetch(BASE + 'data/tutorial.json').then(r => r.json()).then(d => { DOC = d; subs.forEach(f => f()); }).catch(() => {});
const useDoc = () => { const [, f] = useState(0); useEffect(() => { const g = () => f(x => x + 1); subs.add(g); return () => subs.delete(g); }, []); return DOC; };
const learned = () => state().ui?.learned || [];
const markLearned = id => update(x => { x.ui = { ...(x.ui || {}), learned: [...new Set([...(x.ui?.learned || []), id])] }; });

export function Learn() {
  const doc = useDoc(), open = route().parts[1];
  if (!doc) return html`<div class="empty">Loading lessons…</div>`;
  const done = learned();
  const lesson = doc.lessons.find(l => l.id === open);
  if (lesson) return html`<header class="screen-head"><div><div class="sub"><a href="#/learn">Learn</a> · ${lesson.minutes} min</div><h1>${lesson.title}</h1></div></header>
    <ol class="lesson">${lesson.steps.map((s, i) => html`<li class="card glass"><span class="lesson-n">${i + 1}</span><div><div class="headline">${s.title}</div><p class="callout mt-1">${s.body}</p>${s.action && html`<a class="btn ghost mt-3" href=${s.action.href}>${s.action.label}</a>`}</div></li>`)}</ol>
    <div class="row wrap mt-4">${(() => { const i = doc.lessons.indexOf(lesson), n = doc.lessons[i + 1]; return html`<a class="btn primary" href=${n ? `#/learn/${n.id}` : '#/today'} onClick=${() => markLearned(lesson.id)}>${n ? `Next: ${n.title}` : 'Done — back to Today'}</a>`; })()}</div>`;
  return html`<header class="screen-head"><div><div class="sub">${done.length} of ${doc.lessons.length} done · about ${doc.lessons.reduce((a, l) => a + l.minutes, 0)} min</div><h1>Learn</h1></div></header>
    <div class="grid-2"><div class="list">${doc.lessons.map((l, i) => html`<a href=${`#/learn/${l.id}`}><span class="glyph" style=${done.includes(l.id) ? 'background:var(--c-accent);color:var(--c-on-accent)' : ''}>${done.includes(l.id) ? html`<${Icon} n="check" s=${18} />` : i + 1}</span><span class="grow"><span class="t">${l.title}</span><br/><span class="d">${l.minutes} min · ${l.steps.length} steps</span></span><${Icon} n="chevron" s=${16} /></a>`)}</div>
    <section class="card glass-thin"><div class="headline">New here?</div><p class="callout mt-2">Start with "How BackForge works", then "Set up in 5 minutes". Every screen has a ? that opens its lesson.</p></section></div>`;
}

/** The "?" in a screen header: opens the lesson for this screen. */
export function HelpFor({ screen }) {
  const doc = useDoc(); if (!doc) return null;
  const l = doc.lessons.find(x => x.screens.includes(screen)); if (!l) return null;
  return html`<a class="icon-btn glass-thin" href=${`#/learn/${l.id}`} aria-label=${`Help: ${l.title}`} title=${l.title}><b style="font-size:17px">?</b></a>`;
}

/** First run: a short welcome with the two things that matter most (equipment, then the first check-up). */
export function FirstRun() {
  const S = state();
  const [step, setStep] = useState(0);
  const show = !isDemo() && !S.ui?.onboarded && !(S.log?.length > 3);
  const close = () => update(x => { x.ui = { ...(x.ui || {}), onboarded: new Date().toISOString() }; });
  if (!show) return null;
  return html`<${Sheet} open=${true} onClose=${close} label="Welcome to BackForge">
    ${step === 0 && html`<div class="kicker" style="color:var(--c-accent)">Welcome</div><h2 class="title2 mt-2">Your back coach, in your pocket</h2>
      <p class="callout mt-2">BackForge tests what's weak, builds a plan around it, and a voice coach runs every session in real time. Two minutes to set up.</p>
      <div class="row wrap mt-4"><button class="btn primary" onClick=${() => setStep(1)}>Set up</button><a class="btn ghost" href="#/learn" onClick=${close}>Take the tour</a><button class="btn text" onClick=${close}>Skip</button></div>`}
    ${step === 1 && html`<h2 class="title2">What do you have at home?</h2><p class="callout mt-2 mb-3">Tick everything — plans use only this, and use all of it.</p><${KitScreen} embedded />
      <button class="btn primary big mt-4" onClick=${() => setStep(2)}>Next</button>`}
    ${step === 2 && html`<h2 class="title2">Start with a check-up</h2><p class="callout mt-2">The movement assessment (12 min) and posture check (15 min) make every session yours. You can also just train today and test later.</p>
      <div class="row wrap mt-4"><a class="btn primary" href="#/checkup/movement" onClick=${close}>Start the assessment</a><a class="btn ghost" href="#/live" onClick=${close}>Train first</a></div>`}
  </${Sheet}>`;
}
