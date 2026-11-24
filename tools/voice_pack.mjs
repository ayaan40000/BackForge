/* Build + check a coach voice pack from a folder of audio files.
     node tools/voice_pack.mjs app/voice/<pack-id>
   Files in the folder must be named <id>.<ext> where <id> is the sentence id from
   data/voice-corpus.json (ext: m4a, mp3, ogg, opus, wav). Writes manifest.json
   ({sentences: {text: [file, seconds]}}), measuring each clip with ffprobe when
   available (otherwise seconds = estimate; the coach then times by word count).
   Prints coverage and exits 1 if below 100% (use --allow-partial to only warn). */
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const dir = process.argv[2]; if (!dir) { console.error('usage: node tools/voice_pack.mjs app/voice/<pack-id> [--allow-partial]'); process.exit(2); }
const corpus = JSON.parse(fs.readFileSync(new URL('../data/voice-corpus.json', import.meta.url), 'utf8')).items;
const files = new Map(fs.readdirSync(dir).filter(f => /\.(m4a|mp3|ogg|opus|wav|aac)$/i.test(f)).map(f => [f.replace(/\.[^.]+$/, ''), f]));
let ffprobe = true; try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch { ffprobe = false; }
const dur = f => { if (!ffprobe) return null; try { return Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, f)]).toString()) * 100) / 100; } catch { return null; } };
const sentences = {}, missing = [], bad = [];
for (const it of corpus) {
  const f = files.get(it.id);
  if (!f) { missing.push(it); continue; }
  const d = dur(f);
  if (ffprobe && (d == null || d <= 0.15 || d > 30)) { bad.push(`${f} (${d}s)`); continue; }
  sentences[it.text] = [f, d ?? Math.round((it.text.split(/\s+/).length / 2.6 + 0.3) * 100) / 100];
}
const id = path.basename(path.resolve(dir));
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ voice: id, built: new Date().toISOString(), sentences }, null, 0));
const pct = (100 * Object.keys(sentences).length / corpus.length).toFixed(1);
console.log(`${id}: ${Object.keys(sentences).length}/${corpus.length} sentences (${pct}%)${ffprobe ? '' : ' — ffprobe not found: durations estimated'}`);
if (bad.length) console.log(`unusable files (empty or too long): ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? '…' : ''}`);
if (missing.length) {
  fs.writeFileSync(path.join(dir, 'missing.csv'), 'id,style,category,text\n' + missing.map(i => [i.id, i.style, i.category, '"' + i.text.replace(/"/g, '""') + '"'].join(',')).join('\n') + '\n');
  console.log(`missing ${missing.length} — listed in ${path.join(dir, 'missing.csv')}`);
}
const extra = [...files.keys()].filter(k => !corpus.some(i => i.id === k));
if (extra.length) console.log(`${extra.length} files are not in the current corpus (old lines) — safe to delete`);
if ((missing.length || bad.length) && !process.argv.includes('--allow-partial')) process.exit(1);
