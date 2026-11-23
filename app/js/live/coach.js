// Coach script: turns a compiled timeline into timed voice lines + audio cues,
// the way a personal trainer / physio runs a session (docs/DESIGN-PROTOCOL.md §8):
//   arrive (greet · goal · safety) → brief (name + dose · ONE setup cue · ONE focus cue)
//   → 3-2-1 → go → 1.5 s silence → form cue ≈⅓ → encouragement ≈⅔ → "last five"
//   → rest: specific praise · recovery breath · pain check · preview next at T-12 · "get set" at T-6
//   → close: specific praise · down-breathing · log pain.
// Scheduler rules (§8.4): word budget ≈ 2.3 words/s, quiet in the last 3.2 s of
// every segment and the first 1.5 s after "go", lower-priority lines are DROPPED
// (never delayed), one utterance at a time.

export const WPS = 2.3;
const QUIET_END = 3.2, QUIET_GO = 1.5;
const words = t => t.trim().split(/\s+/).filter(Boolean).length;
export const speakSec = t => words(t) / WPS + 0.3;

// priorities (higher wins): safety 6 · brief/switch 5 · form/preview/milestone 4 · praise/position 3 · encourage 2 · breath/count 1
const P = { safety: 6, brief: 5, switch: 5, form: 4, preview: 4, milestone: 4, praise: 3, position: 3, enc: 2, breath: 1, count: 1, close: 5 };
// chattiness (§8.4): Quiet keeps only the essentials
const QUIET_KINDS = new Set(['safety', 'brief', 'switch', 'milestone', 'close']);

const PLACEHOLDER = /\{(\w+)\}/g;
/** Fill a template. Returns null if any placeholder has no value (the line is skipped, never spoken half-empty). */
export function fill(tpl, vars) {
  let missing = false;
  const out = tpl.replace(PLACEHOLDER, (m, k, off) => {
    let v = vars[k];
    if (v == null || v === '') { missing = true; return ''; }
    v = String(v).replace(/[.\s]+$/, '');
    // mid-sentence cue → lower-case first letter ("Focus: pelvis level"), but keep names/acronyms
    if (/Cue$|^cue$/.test(k) && off > 0 && !/[.!?]\s*$/.test(tpl.slice(0, off)) && /^[A-Z][a-z]+\b/.test(v) && !/^[A-Z][a-z]*[A-Z]/.test(v)) v = v[0].toLowerCase() + v.slice(1);
    return v;
  });
  if (missing) return null;
  return out.replace(/\s+([.,!?])/g, '$1').replace(/([.!?])\.+/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/** Shuffle-bag picker: draws without replacement, never one of the last 3 in a category,
 *  never the same rendered sentence within 10 minutes when an alternative exists. */
export function makePicker(lines, seed = 1) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const bags = {}, recent = {}, said = new Map();
  return (key, vars = {}, at = 0) => {
    const pool = lines[key];
    if (!Array.isArray(pool) || !pool.length) return '';
    const rendered = pool.map((t, i) => ({ i, text: fill(t, vars) })).filter(x => x.text);
    if (!rendered.length) return '';
    if (!bags[key] || !bags[key].length) bags[key] = pool.map((_, i) => i).sort(() => rnd() - 0.5);
    const last = recent[key] || [];
    const ok = x => !last.includes(x.i) && !(said.has(x.text) && at - said.get(x.text) < 600);
    let choice = bags[key].map(i => rendered.find(r => r.i === i)).find(r => r && ok(r))
      || rendered.find(ok) || rendered.find(r => r.i !== last[last.length - 1]) || rendered[0];
    bags[key] = bags[key].filter(i => i !== choice.i);
    recent[key] = [...last, choice.i].slice(-Math.min(3, pool.length - 1));
    said.set(choice.text, at);
    return choice.text;
  };
}

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const sentence = s => { s = (s || '').replace(/\s*[—–]\s*/g, ', ').replace(/[.\s]+$/, ''); return s ? s[0].toUpperCase() + s.slice(1) + '.' : ''; };

/** "12 reps each side, three sets." / "30-second hold each side." — grammar in code, not templates. */
export function doseText(s) {
  const each = s.sides && s.sides[0] ? ' each side' : s.alternating ? ', alternating sides' : '';
  const sets = s.sets > 1 ? `, ${NUM[s.sets] || s.sets} sets` : '';
  if (s.holdSec && s.holdSec >= 120) return `${Math.round(s.holdSec / 60)} minutes, nice and easy.`;
  if (s.holdSec) return `${s.holdSec}-second hold${each}${sets}.`;
  const held = s.repHoldSec ? `, holding each for ${s.repHoldSec}` : '';
  return `${s.reps} reps${each}${held}${sets}.`;
}

/**
 * @param {{segments:any[], totalSec:number}} timeline  from compile()
 * @param {Record<string,any>} lines  data/voice-lines.json
 * @param {{name?:string, mins:number, readiness?:string, pain?:number, sleep?:string, weakSide?:string, chattiness?:'quiet'|'standard'|'full', seed?:number}} ctx
 */
export function scriptSession(timeline, lines, ctx) {
  const pick = makePicker(lines, ctx.seed ?? 7);
  const segs = timeline.segments;
  const chat = ctx.chattiness || 'standard';
  const exCount = segs.find(s => s.exCount)?.exCount || 0;
  const mainIdx = segs.filter(s => s.type === 'prep' && s.section === 'main').map(s => s.exIndex);
  const lastMain = mainIdx.length ? Math.max(...mainIdx) : -1;
  const halfAt = timeline.totalSec / 2;
  let halfwayDone = false, coolDone = false, grew = false, longest = 0;
  const painChecked = new Set(), previewed = new Set();
  const base = {
    name: ctx.name || '', minutes: ctx.mins, moves: exCount, weakSide: ctx.weakSide || '',
    pain: ctx.pain ?? '', sleepPhrase: ctx.sleep === 'poor' ? 'a short night' : ctx.sleep === 'great' ? 'a solid night' : '',
    loadPhrase: { full: 'a full session', trimmed: 'a steady session', micro: 'a lighter session', relief: 'a gentle relief session' }[ctx.readiness] || '',
  };

  for (const s of segs) {
    s.lines = []; s.beeps = [];
    const abs = at => s.start + at;
    const ex = s.exId ? { setupCue: s.setupCue || s.cues[0] || '', focusCue: s.focusCue || s.cues[1] || s.cues[0] || '', cue: s.cues[2] || s.cues[1] || '' } : {};
    const nxt = segs.slice(s.i + 1).find(x => x.exId);
    const v = {
      ...base, ...ex, ex: s.name, side: s.side || '', otherSide: s.side === 'left' ? 'right' : s.side === 'right' ? 'left' : '',
      set: s.set, sets: s.sets, reps: s.reps, sec: s.holdSec, regression: s.regression ? s.regression.replace(/\.$/, '').toLowerCase() : '',
      next: nxt?.name || '', nextSetup: nxt ? (nxt.setupCue || nxt.cues?.[0] || '') : '',
      minsLeft: Math.max(1, Math.round((timeline.totalSec - s.start) / 60)), longest: longest || '',
    };
    const say = (at, text, kind) => { if (!text) return; if (chat === 'quiet' && !QUIET_KINDS.has(kind)) return; s.lines.push({ at: Math.max(0, at), text, pri: P[kind] ?? 2, kind }); };
    let cursor = 0;
    const chain = (text, kind, gap = 0.35) => { if (!text) return; const at = cursor + gap; say(at, text, kind); cursor = at + speakSec(text); };
    const beep = (at, tone) => s.beeps.push({ at, tone });

    if (s.type === 'intro') {
      chain(pick('greet', v, abs(0)), 'brief', 0.4);
      chain(pick('goal', v, abs(cursor)), 'form', 0.6);
      chain(pick('safety', v, abs(cursor)), 'safety', 0.6);
      need(s, cursor);
    }

    if (s.type === 'prep') {
      if (s.section === 'cool' && !coolDone) { coolDone = true; chain(pick('cooldown', v, abs(0)), 'milestone', 0.3); }
      if (s.exIndex === lastMain && s.section === 'main' && lastMain > 0) chain(pick('lastmove', v, abs(cursor)), 'milestone', 0.3);
      chain(`${pick(s.exIndex === 0 ? 'announce_first' : 'announce', v, abs(cursor))} ${doseText(s)}`, 'brief', 0.3);
      if (s.note) chain(sentence(s.note), 'brief');
      const heard = (segs[s.i - 1]?.lines || []).some(l => l.kind === 'preview' && ex.setupCue && l.text.includes(ex.setupCue.replace(/\.$/, '')));
      if (ex.setupCue && !heard) chain(sentence(ex.setupCue), 'brief', 0.5);
      if (ex.focusCue && ex.focusCue !== ex.setupCue) chain(pick('focus', v, abs(cursor)), 'form', 0.5);
      if (need(s, cursor)) grew = true;
      say(s.sec - QUIET_END - 1.6, pick('position', v, abs(s.sec)), 'position');
      countdown(s, beep);
    }

    if (s.type === 'work') {
      beep(0, 'go');
      const lastSet = s.set === s.sets && (!s.side || s.side === s.sides[s.sides.length - 1]);
      const formLine = lastSet && s.sets > 1 ? pick('lastset', v, abs(1)) : (ex.cue ? pick('form', v, abs(1)) : '');
      if (s.holdSec) {
        longest = Math.max(longest, s.holdSec);
        say(QUIET_GO + 0.1, pick('hold', v, abs(1.6)), 'brief');
        if (s.sec >= 15) say(Math.max(QUIET_GO + 2.5, s.sec * 0.33), formLine, 'form');
        if (s.sec >= 20) { beep(s.sec / 2, 'half'); say(s.sec / 2 + 0.3, pick('breath', v, abs(s.sec / 2)), 'breath'); }
        if (s.sec >= 20) say(s.sec * 0.68, pick('encourage', v, abs(s.sec * 0.68)), 'enc');
        if (s.sec >= 15) say(s.sec - 6, pick('final', v, abs(s.sec - 6)), 'form');
        if (s.sec >= 90) for (let t = 40; t < s.sec - 20; t += 40) say(t, pick('breath_down', v, abs(t)), 'breath');
        countdown(s, beep);
      } else {
        const reps = s.reps || 10, per = s.sec / reps;
        say(s.sec * 0.33, formLine || pick('breath', v, abs(s.sec * 0.33)), 'form');
        if (s.sec >= 20) say(s.sec * 0.62, pick(s.category === 'strength' || s.category === 'glute' ? 'breath' : 'encourage', v, abs(s.sec * 0.62)), 'enc');
        if (per >= 4.5 || chat === 'full') for (let r = 2; r <= reps - 2; r++) say((r - 1) * per, NUM[r] || String(r), 'count');
        if (reps >= 4) { say(s.sec - 2 * per, 'Two more.', 'form'); say(s.sec - per, 'Last one.', 'form'); }
        beep(s.sec - 0.05, 'end');
      }
    }

    if (s.type === 'switch') {
      const sd = segs[s.i + 1]?.side || '';
      beep(0, 'switch');
      say(0.3, pick('switch', { ...v, side: sd }, abs(0)), 'switch');
      countdown(s, beep);
    }

    if (s.type === 'rest') {
      beep(0, 'rest');
      const prevWork = segs.slice(0, s.i).reverse().find(x => x.type === 'work');
      const pv = { ...v, side: prevWork?.side || '', sec: prevWork?.holdSec || '', weakSide: prevWork?.side && prevWork.side === base.weakSide ? base.weakSide : '', set: s.sets > 1 ? s.set : '', sets: s.sets > 1 ? s.sets : '' };
      chain(`${pick('praise', pv, abs(0))} ${pick('rest_len', { rest: Math.round(s.sec) }, abs(0))}`, 'praise', 0.5);
      if (!halfwayDone && s.start + s.sec >= halfAt) { halfwayDone = true; beep(cursor + 0.3, 'half'); chain(pick('halfway', v, abs(cursor)), 'milestone', 0.9); }
      if (s.section === 'main' && s.set === 1 && !painChecked.has(s.exId)) { painChecked.add(s.exId); chain(pick('paincheck', v, abs(cursor)), 'form', 0.6); }
      else if (s.sec >= 25) chain(pick('recover', v, abs(cursor)), 'breath', 0.8);
      const n = segs[s.i + 1];
      if (n?.type === 'work') {
        say(s.sec - 12, pick('next_set', { set: n.set, sets: n.sets }, abs(s.sec - 12)), 'preview');
        say(s.sec - 6, pick('position', v, abs(s.sec - 6)), 'position');
        countdown(s, beep);
      } else if (n?.type === 'prep') { const t = pick('preview', v, abs(s.sec - 12)); say(Math.max(cursor + 0.4, s.sec - 12), t, 'preview'); }
    }

    if (s.type === 'outro') {
      beep(0, 'finish');
      chain(pick('close', v, abs(0)), 'close', 1.2);
      chain(pick('breath_down', v, abs(cursor)), 'breath', 1.2);
      chain(pick('breath_down', v, abs(cursor)), 'breath', 2.5);
      chain(pick('logpain', v, abs(cursor)), 'close', 1.5);
      if (need(s, cursor)) grew = true;
    }
    fitLines(s);
  }
  if (grew) { let t = 0; for (const x of segs) { x.start = t; t += x.sec; } timeline.totalSec = t; }
  return timeline;
}

/** Let the briefing breathe: a prep/intro grows (≤ 28 s) rather than cutting its brief. */
function need(s, cursor) {
  const n = Math.ceil(cursor + 1.2 + (s.type === 'outro' ? 1 : QUIET_END + 1.4));
  if (n > s.sec) { s.sec = Math.min(s.type === 'outro' ? 45 : 28, n); return true; }
  return false;
}

function countdown(s, beep) { if (s.sec >= 6) for (const k of [3, 2, 1]) beep(s.sec - k, 'tick'); }

/** Keep lines that fit; drop (never delay) lower-priority lines that collide. */
export function fitLines(s) {
  s.lines.sort((a, b) => a.at - b.at || b.pri - a.pri);
  const quietFrom = s.type === 'outro' ? Infinity : s.sec - QUIET_END;
  const kept = [];
  for (const l of s.lines) {
    if (l.at + speakSec(l.text) > quietFrom && l.pri < P.safety) continue;
    const prev = kept[kept.length - 1];
    if (prev && prev.at + speakSec(prev.text) > l.at) {
      if (l.pri > prev.pri && prev.kind !== 'brief' && prev.kind !== 'safety') kept.pop(); else continue;
    }
    kept.push(l);
  }
  s.lines = kept;
}

/** All lines with absolute times (captions / transcript / tests). */
export const transcript = tl => tl.segments.flatMap(s => s.lines.map(l => ({ t: s.start + l.at, seg: s.i, ...l })));
