// You → Privacy & data: PIN, encrypted photo vault, erase everything. (Moved from the classic app in v4.8.)
import { html, useState } from '../../vendor/htm-preact.mjs';
import { Icon } from '../ui/icons.js';
import { state, update, KEY, DEMO_KEY, UI_KEY } from '../store.js';
import { PIN_DISCLAIMER, pinRecord, pinCheck, vaultCreate, vaultOpen, sealFile, openFile } from '../engine/vault.js';
import { VIEWS } from '../engine/photo.js';
import { dayStr } from '../engine/dates.js';
import * as media from '../media.js';

let vaultKey = null, lockTimer = null;
const arm = (set) => { clearTimeout(lockTimer); lockTimer = setTimeout(() => { vaultKey = null; set?.(x => x + 1); }, 600000); };
const download = (obj, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' })); a.download = name; a.click(); };

export function Privacy() {
  const S = state(), [, force] = useState(0), [msg, setMsg] = useState('');
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [old, setOld] = useState('');
  const [v1, setV1] = useState(''), [v2, setV2] = useState(''), [vp, setVp] = useState('');
  const [confirmErase, setConfirmErase] = useState('');
  const hasPin = !!S.profile?.pinRecord, hasVault = !!S.vault?.checkB64;
  const say = m => { setMsg(m); force(x => x + 1); };

  const savePin = async () => {
    try {
      if (hasPin && !(await pinCheck(old, S.profile.pinRecord))) return say('Your current PIN is not right.');
      if (p1 !== p2) return say('The two PINs do not match.');
      const rec = await pinRecord(p1);
      update(x => { x.profile = { ...(x.profile || {}), pinRecord: rec, lock: { fails: 0, lockedUntil: 0 } }; });
      setP1(''); setP2(''); setOld(''); say('PIN saved. Only a salted hash is stored on this device.');
    } catch (e) { say(e.message); }
  };
  const removePin = async () => { if (!(await pinCheck(old, S.profile.pinRecord))) return say('Your current PIN is not right.'); update(x => { delete x.profile.pinRecord; }); setOld(''); say('PIN removed.'); };
  const makeVault = async () => { try { if (v1 !== v2) return say('The two passphrases do not match.'); const r = await vaultCreate(v1); update(x => { x.vault = { ...(x.vault || {}), ...r.vault }; }); vaultKey = r.key; arm(force); setV1(''); setV2(''); say('Vault ready and unlocked — it locks itself after 10 minutes.'); } catch (e) { say(e.message); } };
  const unlock = async () => { try { vaultKey = await vaultOpen(vp, S.vault); arm(force); setVp(''); say('Vault unlocked for 10 minutes.'); } catch (e) { say(e.message); } };
  const exportSet = async () => {
    const cap = [...S.posture.captures].reverse().find(c => c.status !== 'discarded' && Object.keys(c.views || {}).length);
    if (!cap) return say('No photo set to encrypt yet.');
    let n = 0; const ids = {};
    for (const [view, pid] of Object.entries(cap.views)) { const b = await media.get(pid); if (!b) continue; const env = await sealFile(vaultKey, S.vault, new Uint8Array(await b.arrayBuffer()), { view, capturedOn: cap.date }); ids[view] = env.id; download(env, env.id + '.enc.json'); n++; await new Promise(r => setTimeout(r, 300)); }
    update(x => { const c = x.posture.captures.find(y => y.id === cap.id); if (c) c.vaultIds = { ...(c.vaultIds || {}), ...ids }; });
    say(`${n} encrypted file${n === 1 ? '' : 's'} downloaded. Keep them wherever you back up (e.g. the repo's vault/ folder). Only ciphertext leaves this device.`);
  };
  const restore = async e => {
    const files = [...(e.target.files || [])]; e.target.value = ''; if (!files.length) return;
    const pass = prompt('Vault passphrase for these files'); if (!pass) return;
    const cache = new Map(); let ok = 0, bad = 0; const views = {};
    for (const f of files) {
      try { const env = JSON.parse(await f.text()); const bytes = await openFile(pass, env, cache); const pid = 'ph-restored-' + env.id; await media.put(pid, new Blob([bytes], { type: env.meta?.mediaType || 'image/jpeg' })); const v = VIEWS.some(x => x.id === env.meta?.view) ? env.meta.view : null; if (v) views[v] = pid; ok++; }
      catch { bad++; }
    }
    if (ok) update(x => { x.posture.captures.push({ id: 'cap-restored-' + Date.now().toString(36), date: dayStr(), status: 'done', views, viewMeta: {}, requestId: null, restored: true }); if (!x.vault?.checkB64) {/* fresh device: vault re-created on next setup */} });
    say(`Restored ${ok} photo${ok === 1 ? '' : 's'}${bad ? `; ${bad} file${bad === 1 ? '' : 's'} could not be opened with that passphrase` : ''}.`);
  };
  const eraseAll = async () => {
    for (const k of [KEY, KEY + '_premigration', DEMO_KEY, UI_KEY]) try { localStorage.removeItem(k); } catch {}
    await Promise.race([new Promise(r => { const q = indexedDB.deleteDatabase('backforge_media'); q.onsuccess = q.onerror = q.onblocked = () => r(); }), new Promise(r => setTimeout(r, 1500))]);
    location.replace(location.pathname + '#/today'); location.reload();
  };

  return html`<header class="screen-head"><div><div class="sub"><a href="#/you">You</a></div><h1>Privacy & data</h1></div></header>
  ${msg && html`<div class="banner" role="status" style="background:color-mix(in oklab,var(--c-info) 14%,transparent)">${msg}</div>`}
  <div class="grid-2"><div class="col">
    <section class="card glass"><div class="kicker">PIN</div><p class="callout mt-2">${PIN_DISCLAIMER}</p>
      <div class="stack mt-3">
        ${hasPin && html`<input type="password" inputmode="numeric" maxlength="4" placeholder="Current PIN" value=${old} onInput=${e => setOld(e.target.value)} />`}
        <input type="password" inputmode="numeric" maxlength="4" placeholder=${hasPin ? 'New 4-digit PIN' : 'Choose a 4-digit PIN'} value=${p1} onInput=${e => setP1(e.target.value)} />
        <input type="password" inputmode="numeric" maxlength="4" placeholder="Repeat it" value=${p2} onInput=${e => setP2(e.target.value)} />
      </div>
      <div class="row wrap mt-3"><button class="btn primary" onClick=${savePin}>${hasPin ? 'Change PIN' : 'Set PIN'}</button>${hasPin && html`<button class="btn ghost" onClick=${removePin}>Remove PIN</button>`}</div></section>
    <section class="card glass"><div class="kicker">Encrypted photo vault</div>
      <p class="callout mt-2">Photos stay on this device. The vault turns a photo set into encrypted files you can keep anywhere — only you can open them, with a separate passphrase (not your PIN). AES-256-GCM; nothing readable ever leaves the device.</p>
      ${!hasVault ? html`<div class="stack mt-3"><input type="password" placeholder="Vault passphrase (12+ characters)" value=${v1} onInput=${e => setV1(e.target.value)} /><input type="password" placeholder="Repeat it" value=${v2} onInput=${e => setV2(e.target.value)} /></div><button class="btn primary mt-3" onClick=${makeVault}>Create vault</button>`
      : vaultKey ? html`<div class="row wrap mt-3"><button class="btn primary" onClick=${exportSet}><${Icon} n="lock" s=${18} /> Encrypt latest photo set</button><button class="btn ghost" onClick=${() => { vaultKey = null; say('Vault locked.'); }}>Lock</button></div>`
      : html`<div class="row mt-3" style="gap:8px"><input type="password" placeholder="Vault passphrase" value=${vp} onInput=${e => setVp(e.target.value)} /><button class="btn primary" onClick=${unlock}>Unlock</button></div>`}
      <label class="btn ghost mt-3">Restore from vault files<input type="file" accept=".json,application/json" multiple hidden onChange=${restore} /></label>
      <p class="caption mt-2">Lost the passphrase? The files cannot be opened — by anyone. That is the point.</p></section>
  </div><div class="col">
    <section class="card glass"><div class="kicker" style="color:var(--c-bad)">Erase everything</div>
      <p class="callout mt-2">Deletes all BackForge data on this device: check-ins, sessions, assessments, photos, settings. Export a backup first (You → Data).</p>
      <input class="mt-3" type="text" placeholder='Type "erase" to confirm' value=${confirmErase} onInput=${e => setConfirmErase(e.target.value)} />
      <button class="btn mt-3" style="background:var(--c-bad);color:white" disabled=${confirmErase.trim().toLowerCase() !== 'erase'} onClick=${eraseAll}>Erase all data on this device</button></section>
  </div></div>`;
}
