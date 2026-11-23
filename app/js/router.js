// Hash router with View Transitions (falls back to an instant swap).
const ORDER = ['today', 'live', 'moves', 'progress', 'you'];
let current = parse(), listeners = new Set();
function parse() {
  const raw = (location.hash || '#/today').slice(1);
  const [path, q = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { path, parts, top: parts[0] || 'today', query: Object.fromEntries(new URLSearchParams(q)) };
}
export const route = () => current;
export const onRoute = f => (listeners.add(f), () => listeners.delete(f));
export function go(path, { replace = false } = {}) { const h = '#' + path; if (replace) history.replaceState(null, '', h); else location.hash = h; if (replace) apply(); }
function apply() {
  const next = parse(), prev = current;
  const dir = Math.sign(ORDER.indexOf(next.top) - ORDER.indexOf(prev.top)) || 1;
  document.documentElement.style.setProperty('--vt-dir', dir);
  current = next;
  const run = () => listeners.forEach(f => f());
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce && prev.top !== next.top) document.startViewTransition(run); else run();
  if (prev.top !== next.top) window.scrollTo({ top: 0 });
}
addEventListener('hashchange', apply);
