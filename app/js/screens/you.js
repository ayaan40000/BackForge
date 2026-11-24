// You: profile, check-ups (classic tools during transition), coach, sound, appearance, data, about.
import { html, useState, useEffect } from '../../vendor/htm-preact.mjs';
import { HelpFor } from './learn.js';
import { Icon } from '../ui/icons.js';
import { Seg } from '../ui/kit.js';
import { state, update, uiPrefs, setUi, isDemo, enterDemo, exitDemo, KEY } from '../store.js';
import { BASE } from '../data.js';
import { voices, speak, configureVoice, loadPack, voiceState, packSize, stats } from '../live/voice.js';
import * as voiceMod from '../live/voice.js';
import { unlockAudio, audioReady, cue } from '../live/audio.js';
import { route } from '../router.js';
import { Privacy } from './privacy.js';
import { KitScreen } from './kit.js';
import { dayStr } from '../engine/dates.js';

export const VERSION = '4.8.3';

export function You() {
  const S = state(), p = uiPrefs(), sub = route().parts[1];
  const [vs, setVs] = useState(voices());
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  useEffect(() => { const f = () => setVs(voices()); speechSynthesis?.addEventListener?.('voiceschanged', f); return () => speechSynthesis?.removeEventListener?.('voiceschanged', f); }, []);
  const name = S.profile?.displayName || S.profile?.name || '';
  const last = d => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'never');
  const exportJson = () => { const blob = new Blob([JSON.stringify({ ...S, profile: S.profile ? { ...S.profile, pinRecord: undefined, lock: undefined } : undefined }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backforge-backup-${dayStr()}.json`; a.click(); update(x => { x.backup = { ...(x.backup || {}), lastExportAt: new Date().toISOString() }; }); };

  if (sub === 'checkups') { location.replace('#/checkup'); return null; }
  if (sub === 'privacy') return html`<${Privacy} />`;
  if (sub === 'kit') return html`<${KitScreen} />`;

  return html`
  <header class="screen-head"><div><div class="sub">Profile & settings</div><h1>You</h1></div><span class="avatar" style="width:56px;height:56px;font-size:22px">${(name || 'B')[0]}</span></header>
  <div class="grid-2"><div class="col">
    <section class="card glass"><div class="kicker mb-3">Profile</div>
      <label class="caption">First name</label><input type="text" value=${name} onChange=${e => update(x => { x.profile = { ...(x.profile || {}), displayName: e.target.value.slice(0, 40) }; })} placeholder="What should the coach call you?" />
    </section>
    <section class="card glass"><div class="kicker mb-3">Equipment on hand</div><a class="row between" href="#/you/kit"><span><span class="headline">Bands, rollers, weights…</span><br/><span class="caption">Plans use only what you have — and use all of it.</span></span><${Icon} n="chevron" /></a></section>
    <section class="card glass"><div class="kicker mb-3">Check-ups</div><a class="row between" href="#/checkup"><span><span class="headline">Assessments, posture & photos</span><br/><span class="caption">Last movement check: ${last(S.assessHistory?.at(-1)?.date)}</span></span><${Icon} n="chevron" /></a></section>
    <section class="card glass"><div class="kicker mb-3">Coach</div>
      <div class="list">
        <label><span class="grow t">Voice coach</span><input type="checkbox" class="toggle" checked=${p.voice !== false} onChange=${e => setUi({ voice: e.target.checked })} /></label>
        <label><span class="grow t">Captions</span><input type="checkbox" class="toggle" checked=${p.captions !== false} onChange=${e => setUi({ captions: e.target.checked })} /></label>
        <label><span class="grow t">Music bed (generated, quiet)</span><input type="checkbox" class="toggle" checked=${!!p.bed} onChange=${e => setUi({ bed: e.target.checked })} /></label>
      </div>
      <div class="mt-4"><div class="caption mb-2">How much the coach talks</div><${Seg} label="Chattiness" value=${p.chattiness || 'standard'} onChange=${v => setUi({ chattiness: v })} options=${[['quiet', 'Quiet'], ['standard', 'Standard'], ['full', 'Full']]} /></div>
      <div class="mt-4"><div class="caption mb-2">Speed</div><${Seg} label="Voice speed" value=${p.rate || 1.04} onChange=${v => setUi({ rate: v })} options=${[[0.92, 'Slower'], [1.04, 'Normal'], [1.14, 'Faster']]} /></div>
      <div class="mt-4"><div class="caption mb-2">Coach voice</div><select value=${p.voicePack ?? voiceMod.DEFAULT_PACK} onChange=${async e => { setUi({ voicePack: e.target.value }); const ok = await loadPack(e.target.value, BASE); if (!ok && e.target.value !== 'device') alert('That natural voice isn’t available yet — using the device voice.'); }}>
        ${voiceMod.PACKS.map(v => html`<option value=${v.id}>${v.label}</option>`)}<option value="device">Device voice (built into your phone/computer)</option></select>
        <p class="caption mt-2">Recorded voices play offline once loaded. New voices are added as files (app/voice/index.json).</p></div>
      ${(p.voicePack === 'device') && vs.length > 0 && html`<div class="mt-4"><div class="caption mb-2">Device voice (${vs.length} on this device)</div><select value=${p.voiceName || ''} onChange=${e => setUi({ voiceName: e.target.value || null })}><option value="">Best available</option>${vs.map(v => html`<option value=${v.name}>${v.name}${v.localService ? '' : ' (online)'}</option>`)}</select></div>`}
      <button class="btn ghost mt-3" onClick=${() => { configureVoice({ enabled: true, rate: p.rate || 1.04, name: p.voiceName || undefined }); unlockAudio(); setTimeout(() => { cue('go'); speak('First up: Bird-Dog. Hands under shoulders, knees under hips. Focus: reach long, not high.', { pri: 3 }); setTimeout(() => force?.(x => x + 1), 1500); }, 200); }}><${Icon} n="voice" s=${18} /> Sound check</button>
      <p class="caption mt-2">Sound: ${audioReady() ? 'on' : 'not started yet — tap Sound check'} · Voice: ${voiceState().pack ? `${(voiceMod.PACKS.find(v => v.id === voiceState().pack)?.label || voiceState().pack).split(' —')[0]} (${packSize()} recorded lines)` : 'device voice'}${stats.failed ? ` · ${stats.failed} clips failed to load` : ''}. On iPhone, also check the volume buttons.</p>
      <p class="caption mt-2">Voices come from your device. Other apps' music can't be lowered from a web page; your phone may do it automatically.</p>
    </section>
  </div><div class="col">
    <section class="card glass"><div class="kicker mb-3">Appearance</div>
      <${Seg} label="Theme" value=${p.theme || 'auto'} onChange=${v => setUi({ theme: v })} options=${[['auto', 'System'], ['dark', 'Dark'], ['light', 'Light']]} />
      <div class="list mt-4">
        <label><span class="grow t">Reduce motion</span><input type="checkbox" class="toggle" checked=${!!p.reduceMotion} onChange=${e => setUi({ reduceMotion: e.target.checked })} /></label>
        <label><span class="grow t">Solid surfaces (no glass)</span><input type="checkbox" class="toggle" checked=${!!p.solid} onChange=${e => setUi({ solid: e.target.checked })} /></label>
      </div></section>
    <section class="card glass"><div class="kicker mb-3">Data</div>
      <div class="list">
        <button onClick=${async () => { setBusy(true); try { isDemo() ? exitDemo() : await enterDemo(BASE); } finally { setBusy(false); location.hash = '#/today'; } }}><span class="glyph" style="color:var(--c-reward)"><${Icon} n="spark" s=${20} /></span><span class="grow"><span class="t">${isDemo() ? 'Exit demo data' : 'Preview with demo data'}</span><br/><span class="d">${isDemo() ? 'Back to your real data' : '120 days incl. Google Fit / Samsung Health — kept separate'}</span></span>${busy ? '…' : ''}</button>
        <button onClick=${exportJson} disabled=${isDemo()}><span class="glyph"><${Icon} n="sync" s=${20} /></span><span class="grow"><span class="t">Export backup (JSON)</span><br/><span class="d">Last: ${last(S.backup?.lastExportAt)}${S.backup?.destination ? ` · to ${S.backup.destination}` : ''}</span></span></button>
        <a href="#/progress/health"><span class="glyph"><${Icon} n="heart" s=${20} /></span><span class="grow"><span class="t">Health sync</span><br/><span class="d">Import Muse's Health Connect file</span></span><${Icon} n="chevron" s=${16} /></a>
        <a href="#/you/privacy"><span class="glyph"><${Icon} n="lock" s=${20} /></span><span class="grow"><span class="t">Privacy & data</span><br/><span class="d">PIN, encrypted photo vault, erase everything</span></span><${Icon} n="chevron" s=${16} /></a>
      </div><p class="caption mt-2">Everything lives on this device (key <code>${KEY}</code>). Nothing is uploaded, ever.</p></section>
    <section class="card glass-thin"><div class="kicker mb-2">About</div><p class="callout">BackForge ${VERSION}. BackForge screens patterns and trains; it does not diagnose. Sharp pain, anything down the leg, numbness or weakness: stop and see a professional.</p>
      <p class="caption mt-2"><a href=${BASE + 'docs/ROADMAP.md'}>Roadmap</a> · <a href=${BASE + 'CHANGELOG.md'}>What's new</a></p></section>
  </div></div>`;
}
