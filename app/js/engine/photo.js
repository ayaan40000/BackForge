// Photo posture check — the Muse bridge contract (pure; storage is in ../media.js).
// Request v2 carries the test grades so Muse can say whether the photos agree,
// and (optionally) the previous photos so Muse can describe change over time.
// Results v1 (classic) and v2 are both accepted; every field is validated.
import { GSEV } from './posture.js';

export const VIEWS = [
  { id: 'side-right', label: 'Right side', hint: 'Side-on to the camera, arms relaxed, ear visible.', checks: ['Right shoulder toward the camera', 'Ear, shoulder, hip and ankle all in frame', 'Arms hanging relaxed, not posing'] },
  { id: 'side-left', label: 'Left side', hint: 'Same stance, other side.', checks: ['Left shoulder toward the camera', 'Ear, shoulder, hip and ankle all in frame', 'Arms hanging relaxed, not posing'] },
  { id: 'front', label: 'Front', hint: 'Face the camera, arms relaxed.', checks: ['Facing the camera, feet hip-width', 'Head to feet in frame', 'Shoulders relaxed, not pulled back'] },
  { id: 'back', label: 'Back', hint: 'Back to the camera, arms relaxed.', checks: ['Back to the camera, feet hip-width', 'Shoulder blades visible (fitted top or bare back)', 'Head to feet in frame'] },
];
export const STANCE = ['Barefoot, feet hip-width', 'Stand naturally — do not pose straight', 'Fitted clothes', 'Camera at waist height, level, 2.5–3 m away', 'Plain background, same spot as last time'];

export const PHOTO_PATTERNS = ['pelvicTilt', 'forwardHead', 'shoulderRound', 'thoracicKyphosis', 'shoulderAsymmetry', 'pelvicObliquity', 'lateralShift'];
export const PHOTO_LABEL = { pelvicTilt: 'Pelvic tilt', forwardHead: 'Forward head', shoulderRound: 'Rounded shoulders', thoracicKyphosis: 'Hunched upper back', shoulderAsymmetry: 'Shoulder height difference', pelvicObliquity: 'Pelvis level', lateralShift: 'Sideways shift' };
/** photo pattern → posture-check pattern */
export const TO_TEST = { pelvicTilt: 'apt', forwardHead: 'head', thoracicKyphosis: 'back', shoulderRound: 'shoulders' };
export const PGRADES = ['clear', 'mild', 'moderate', 'marked', 'not-assessable'];
const PSEV = { clear: 0, mild: 1, moderate: 2, marked: 3 };

export const PROMPT_V2 = 'You are screening standing posture from photos for a back-rehab app. SCREENING ONLY — not diagnosis, no medical claims. ' +
  'For each pattern in the schema (pelvicTilt, forwardHead, shoulderRound, thoracicKyphosis, shoulderAsymmetry, pelvicObliquity, lateralShift) return grade clear|mild|moderate|marked|not-assessable, ' +
  '1–3 short observations naming the view used, viewsUsed, and confidence 0–1. Use not-assessable when a landmark is not visible. Do not invent measurements; ' +
  'an estimated angle range is allowed only with confidence < 0.7. The request includes the user\'s own test grades (assessment): for pelvicTilt, forwardHead, thoracicKyphosis and shoulderRound ' +
  'set consistency to agrees|photo-shows-more|photo-shows-less|not-assessable with one sentence why. If previous photos (prev-*.jpg) are included, set progress per pattern to better|same|worse|not-assessable. ' +
  'Return ONLY a JSON object: {"kind":"backforge-posture-result","version":2,"requestId":...,"patterns":{...},"summary":"...","suggestedFocus":[...],"notes":"..."}.';

/** Build the request Muse receives with the photos. */
export function buildRequest({ capture, prevCapture, S, today }) {
  const have = Object.keys(capture.views || {});
  const last = (S.posture?.bandChecks || []).at(-1);
  const ck = (S.checkins || []).at(-1);
  const reqId = 'pos_' + today + '_' + Math.random().toString(36).slice(2, 6);
  return {
    kind: 'backforge-posture-request', version: 2, requestId: reqId, createdAt: new Date().toISOString(),
    appContext: { knownPatterns: [...(S.results || []).map(f => f.t), ...(S.posture?.findings || []).map(f => f.t)], painToday: ck ? ck.pain : null },
    assessment: last ? { date: last.date, patterns: { pelvicTilt: last.summary?.apt || null, forwardHead: last.summary?.head || last.summary?.upper || null, thoracicKyphosis: last.summary?.back || null, shoulderRound: last.summary?.shoulders || last.summary?.upper || null }, tests: last.grades } : null,
    images: VIEWS.filter(v => have.includes(v.id)).map(v => ({ view: v.id, file: v.id + '.jpg', ...(capture.viewMeta?.[v.id] || {}) })),
    previous: prevCapture ? { date: prevCapture.date, images: VIEWS.filter(v => prevCapture.views?.[v.id]).map(v => ({ view: v.id, file: 'prev-' + v.id + '.jpg' })) } : null,
    missing: VIEWS.filter(v => !have.includes(v.id)).map(v => v.id),
    prompt: PROMPT_V2,
  };
}

/** Validate Muse's reply. Throws on a wrong kind/version; drops bad fields, never invents them. */
export function parseResult(json, today) {
  const r = typeof json === 'string' ? JSON.parse(json) : json;
  if (!r || r.kind !== 'backforge-posture-result') throw new Error('That is not a BackForge posture result (kind must be "backforge-posture-result").');
  if (r.version !== 1 && r.version !== 2) throw new Error(`Unsupported posture-result version (${r.version}).`);
  const viewIds = VIEWS.map(v => v.id); const pats = {}; let dropped = 0;
  for (const k of PHOTO_PATTERNS) {
    const p = r.patterns?.[k]; if (!p) continue;
    if (!PGRADES.includes(p.grade)) { dropped++; continue; }
    pats[k] = {
      grade: p.grade,
      confidence: typeof p.confidence === 'number' ? Math.max(0, Math.min(1, p.confidence)) : null,
      viewsUsed: Array.isArray(p.viewsUsed) ? p.viewsUsed.filter(v => viewIds.includes(v)) : [],
      direction: typeof p.direction === 'string' ? p.direction.slice(0, 24) : null,
      observations: Array.isArray(p.observations) ? p.observations.filter(x => typeof x === 'string').slice(0, 3).map(x => x.slice(0, 160)) : [],
      consistency: ['agrees', 'photo-shows-more', 'photo-shows-less', 'not-assessable'].includes(p.consistency) ? p.consistency : null,
      consistencyWhy: typeof p.consistencyWhy === 'string' ? p.consistencyWhy.slice(0, 200) : null,
      progress: ['better', 'same', 'worse', 'not-assessable'].includes(p.progress) ? p.progress : null,
    };
  }
  return {
    date: today, requestId: typeof r.requestId === 'string' ? r.requestId.slice(0, 40) : null, version: r.version, patterns: pats,
    summary: typeof r.summary === 'string' ? r.summary.slice(0, 500) : '', notes: String(r.notes || '').slice(0, 400),
    suggestedFocus: Array.isArray(r.suggestedFocus) ? r.suggestedFocus.filter(x => typeof x === 'string').slice(0, 5).map(x => x.slice(0, 80)) : [],
    dropped,
  };
}

/**
 * Do the photos and the tests tell the same story? Computed on-device from the two
 * grades (independent of what Muse says): within one step = agrees.
 */
export function consistency(photoAssessment, check) {
  const out = [];
  for (const [pk, tk] of Object.entries(TO_TEST)) {
    const p = photoAssessment?.patterns?.[pk];
    const tg = check?.summary?.[tk] || (tk === 'head' || tk === 'shoulders' ? check?.summary?.upper : null);
    if (!p && !tg) continue;
    let verdict = 'not-assessable';
    if (p && p.grade !== 'not-assessable' && tg) { const d = PSEV[p.grade] - GSEV[tg]; verdict = Math.abs(d) <= 1 ? 'agrees' : d > 0 ? 'photo-shows-more' : 'photo-shows-less'; }
    else if (!tg) verdict = 'no-test';
    else if (!p) verdict = 'no-photo';
    out.push({ pattern: pk, testPattern: tk, photo: p?.grade || null, test: tg || null, verdict, muse: p?.consistency || null, why: p?.consistencyWhy || null, progress: p?.progress || null, confidence: p?.confidence ?? null });
  }
  return out;
}
export const VERDICT_TEXT = { agrees: 'Photos agree with your tests', 'photo-shows-more': 'Photos show more than your tests', 'photo-shows-less': 'Photos show less than your tests', 'not-assessable': 'Not visible in the photos', 'no-test': 'Not tested yet', 'no-photo': 'Not in this photo set' };
