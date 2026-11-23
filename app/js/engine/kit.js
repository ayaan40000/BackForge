// Equipment on hand. Exercises list what they need in `equipment` (ALL required;
// "none" = bodyweight). The planner only serves moves you can actually do, swaps
// the rest for a same-target alternative, and — when you own something special —
// works one move that uses it into the session ("use what you have").
export const KIT = [
  { group: 'Always around', items: [['mat', 'Mat or rug'], ['wall', 'A clear wall'], ['chair', 'Sturdy chair'], ['doorway', 'Doorway'], ['towel', 'Towel'], ['step', 'Low step or stair']] },
  { group: 'Bands', items: [['mini-band', 'Mini loop bands (around knees/ankles)'], ['band', 'Long bands (flat therapy or large loop)'], ['tube-band', 'Tube band with handles'], ['door-anchor', 'Door anchor for bands'], ['strap', 'Stretch strap / yoga strap']] },
  { group: 'Weights', items: [['dumbbell', 'Dumbbells'], ['kettlebell', 'Kettlebell'], ['bench', 'Bench']] },
  { group: 'Recovery & core', items: [['foam-roller', 'Foam roller'], ['massage-ball', 'Massage / lacrosse ball'], ['stability-ball', 'Stability (Swiss) ball'], ['ab-wheel', 'Ab roller wheel'], ['yoga-block', 'Yoga block'], ['slider', 'Sliders (or a towel on a smooth floor)']] },
  { group: 'Gym', items: [['pullup-bar', 'Pull-up bar'], ['cable', 'Cable machine']] },
];
export const BAND_LEVELS = ['extra-light', 'light', 'medium', 'heavy', 'extra-heavy'];
export const DEFAULT_KIT = ['mat', 'wall', 'chair', 'doorway', 'towel', 'band', 'mini-band'];
// one thing can stand in for another
const SATISFIES = { band: ['band', 'tube-band'], strap: ['strap', 'towel', 'band'], slider: ['slider', 'towel'], mat: ['mat'], bench: ['bench', 'step'] };
export const SPECIAL = ['kettlebell', 'dumbbell', 'foam-roller', 'massage-ball', 'stability-ball', 'door-anchor', 'tube-band', 'slider', 'yoga-block', 'step', 'pullup-bar', 'ab-wheel', 'cable', 'bench'];

/** The user's kit as a Set (defaults when never set). */
export function kitOf(S) { const k = S?.kit?.items; return new Set(Array.isArray(k) ? k : DEFAULT_KIT); }
export function has(kit, need) { if (need === 'none') return true; const alts = SATISFIES[need] || [need]; return alts.some(a => kit.has(a)); }
export const available = (ex, kit) => !!ex && (ex.equipment || ['none']).every(n => has(kit, n));

/** Replace moves the user can't do with a safe, available move that trains the same thing. */
export function fitToKit(lib, ctx, items) {
  const kit = ctx.kit; if (!kit) return { items, notes: [] };
  const used = new Set(items.map(i => i.id)), out = [], notes = [];
  for (const it of items) {
    const ex = lib.get(it.id);
    if (!ex || available(ex, kit)) { out.push(it); continue; }
    const alt = lib.all.find(c => !used.has(c.id) && available(c, kit) && lib.safeGet(c.id, ctx.flags) && c.targets.some(t => ex.targets.includes(t)) && (c.category === ex.category || c.targets.filter(t => ex.targets.includes(t)).length >= 2));
    if (alt) { used.add(alt.id); out.push({ ...it, id: alt.id, dose: alt.dose, name: alt.name, note: it.note }); notes.push(`${ex.name} needs ${ex.equipment.filter(n => !has(kit, n)).join(' + ')} — swapped for ${alt.name}.`); }
    else notes.push(`${ex.name} skipped — needs ${ex.equipment.filter(n => !has(kit, n)).join(' + ')}.`);
  }
  return { items: out, notes };
}

/**
 * "Use what you have": for each special item owned (and not used yet), swap one
 * main-work move for a safe move that uses it and shares a target. Load tools
 * (kettlebell, dumbbell) only on good days (energy great/ok, no flare).
 */
export function useWhatYouHave(lib, ctx, items, { energy = 'ok', maxSwaps = 2, section = 'main' } = {}) {
  const kit = ctx.kit; if (!kit) return { items, notes: [] };
  const out = items.map(i => ({ ...i })), notes = [], used = new Set(out.map(i => i.id));
  let swaps = 0;
  const owned = SPECIAL.filter(s => kit.has(s));
  const usesOwned = id => (lib.get(id)?.equipment || []).some(e => owned.includes(e));
  for (const tool of owned) {
    if (swaps >= maxSwaps) break;
    if (out.some(i => (lib.get(i.id)?.equipment || []).includes(tool))) continue;
    if ((tool === 'kettlebell' || tool === 'dumbbell') && !(energy === 'great' || energy === 'ok')) continue;
    for (let k = out.length - 1; k >= 0; k--) {
      const cur = lib.get(out[k].id); if (!cur || usesOwned(cur.id)) continue;
      const cand = lib.all.find(c => !used.has(c.id) && (c.equipment || []).includes(tool) && available(c, kit) && lib.safeGet(c.id, ctx.flags) && (c.level || 1) <= (energy === 'great' ? 3 : 2) && c.targets.some(t => cur.targets.includes(t)) && (section !== 'main' || c.category !== 'stretch'));
      if (cand) { used.add(cand.id); notes.push(`Using your ${tool.replace('-', ' ')}: ${cand.name} in place of ${cur.name}.`); out[k] = { id: cand.id, dose: cand.dose, name: cand.name }; swaps++; break; }
    }
  }
  return { items: out, notes };
}
