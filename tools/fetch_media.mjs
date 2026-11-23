/* Downloads the start/end photos for every exercise mapped in data/media.json
   (plus `freeDbId` on entries in data/exercises-extra.json) from free-exercise-db
   (public domain), and writes small WebP frames to app/media/<id>-0.webp / -1.webp.
   Skips files that already exist. Needs ffmpeg. Run: node tools/fetch_media.mjs */
import fs from 'fs'; import { execFileSync } from 'child_process';
const R = p => new URL('../' + p, import.meta.url);
const media = JSON.parse(fs.readFileSync(R('data/media.json'), 'utf8'));
const extra = fs.existsSync(R('data/exercises-extra.json')) ? JSON.parse(fs.readFileSync(R('data/exercises-extra.json'), 'utf8')) : [];
for (const e of extra) if (e.freeDbId && !media.photos[e.id]) media.photos[e.id] = { freeDb: e.freeDbId };
fs.mkdirSync(R('app/media'), { recursive: true });
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
let got = 0, skipped = 0, failed = [];
for (const [id, m] of Object.entries(media.photos)) {
  for (const f of [0, 1]) {
    const out = new URL(`../app/media/${id}-${f}.webp`, import.meta.url).pathname;
    if (fs.existsSync(out)) { skipped++; continue; }
    const res = await fetch(`${BASE}${m.freeDb}/${f}.jpg`);
    if (!res.ok) { failed.push(`${id} (${m.freeDb}/${f})`); continue; }
    const tmp = `/tmp/bf-media-${id}-${f}.jpg`; fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-vf', 'scale=420:-2', '-c:v', 'libwebp', '-quality', '72', out]);
    got++;
  }
}
fs.writeFileSync(R('data/media.json'), JSON.stringify(media, null, 1) + '\n');
console.log(`fetched ${got}, already had ${skipped}, failed ${failed.length}${failed.length ? ': ' + failed.join(', ') : ''}`);
