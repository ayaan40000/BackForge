// Encrypted photo vault + PIN (moved from the classic app in v4.8, same formats,
// so files and PINs made by the classic app keep working).
//  Vault: AES-256-GCM, key from a ≥ 12-character passphrase via PBKDF2-HMAC-SHA-256
//  (600k), fresh IV per file, file id bound as AAD. Export = ciphertext-only
//  `.enc.json` envelopes that carry their own salt/iterations, so restore works
//  on a fresh device. The PIN is a privacy screen, never the vault key.
export const PIN_DISCLAIMER = 'This PIN is a privacy screen for this device — it is not encryption and does not protect your data from anyone who has your phone or its backups.';
export const b64e = b => { const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
export const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const enc = t => new TextEncoder().encode(t);

// ---------- PIN ----------
export async function pinDerive(pin, saltB64, iters) {
  const km = await crypto.subtle.importKey('raw', enc('bf-pin:' + pin), 'PBKDF2', false, ['deriveBits']);
  return b64e(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64d(saltB64), iterations: iters, hash: 'SHA-256' }, km, 256));
}
export async function pinRecord(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
  const saltB64 = b64e(crypto.getRandomValues(new Uint8Array(16)));
  return { algo: 'PBKDF2-HMAC-SHA-256', iterations: 310000, saltB64, hashB64: await pinDerive(pin, saltB64, 310000), setAt: new Date().toISOString() };
}
export async function pinCheck(pin, r) {
  if (!r) return false;
  const a = await pinDerive(pin, r.saltB64, r.iterations), b = r.hashB64;
  let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
export const pinLockMs = f => (f >= 8 ? Math.min(7.2e6, 1.8e6 + (f - 8) * 1.8e6) : f >= 5 ? 3e5 : f >= 3 ? 3e4 : 0);

// ---------- vault ----------
export async function vaultDerive(pass, saltB64, iters) {
  const km = await crypto.subtle.importKey('raw', enc(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(saltB64), iterations: iters, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encBytes(key, id, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc(id) }, key, bytes);
  return { iv: b64e(iv), ct: b64e(ct) };
}
export async function decBytes(key, id, ivB64, ctB64) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(ivB64), additionalData: enc(id) }, key, b64d(ctB64))); }

/** Create a vault: returns { vault (store in S.vault), key }. */
export async function vaultCreate(pass) {
  if (pass.length < 12) throw new Error('The vault passphrase needs at least 12 characters.');
  const saltB64 = b64e(crypto.getRandomValues(new Uint8Array(16))), iterations = 600000;
  const key = await vaultDerive(pass, saltB64, iterations);
  const chk = await encBytes(key, 'vault-check', enc('backforge-vault-check-v1'));
  return { vault: { saltB64, iterations, checkB64: JSON.stringify(chk) }, key };
}
export async function vaultOpen(pass, vault) {
  const key = await vaultDerive(pass, vault.saltB64, vault.iterations || 600000);
  const chk = JSON.parse(vault.checkB64);
  const out = await decBytes(key, 'vault-check', chk.iv, chk.ct).catch(() => null);
  if (!out || new TextDecoder().decode(out) !== 'backforge-vault-check-v1') throw new Error('That passphrase did not unlock the vault. Nothing was changed.');
  return key;
}
/** One photo → a self-describing ciphertext envelope. */
export async function sealFile(key, vault, bytes, meta) {
  const id = 'vf-' + b64e(crypto.getRandomValues(new Uint8Array(6))).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const e = await encBytes(key, id, bytes);
  return { kind: 'backforge-vault-file', version: 1, id, alg: 'AES-256-GCM', kdf: 'PBKDF2-HMAC-SHA-256', iterations: vault.iterations, salt: vault.saltB64, iv: e.iv, ct: e.ct, meta: { mediaType: 'image/jpeg', createdAt: new Date().toISOString(), ...meta } };
}
/** Open an envelope with a passphrase (derives from the envelope's own salt — works on a fresh device). */
export async function openFile(pass, env, keyCache = new Map()) {
  if (env?.kind !== 'backforge-vault-file') throw new Error('Not a BackForge vault file.');
  const k = env.salt + ':' + env.iterations;
  if (!keyCache.has(k)) keyCache.set(k, await vaultDerive(pass, env.salt, env.iterations));
  return decBytes(keyCache.get(k), env.id, env.iv, env.ct);
}
