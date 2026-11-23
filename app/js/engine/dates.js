// Local-date helpers. All dates are LOCAL "YYYY-MM-DD" strings — never toISOString()
// (classic expert-review blocker #1: UTC dates logged evening users into tomorrow).
export const pad = n => String(n).padStart(2, '0');
export const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
/** Monday = 0 … Sunday = 6 (matches the classic app's (getDay()+6)%7). */
export const weekday = s => (parseDay(s).getDay() + 6) % 7;
