// Vault + PIN (moved from the classic app in v4.8). Real WebCrypto round-trips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinRecord, pinCheck, pinLockMs, vaultCreate, vaultOpen, sealFile, openFile } from '../app/js/engine/vault.js';

test('PIN: 4 digits only, salted hash only, constant-time check, escalating lockout', async () => {
  await assert.rejects(pinRecord('12a4')); await assert.rejects(pinRecord('12345'));
  const r = await pinRecord('4821');
  assert.ok(!JSON.stringify(r).includes('4821'), 'the PIN itself is never stored');
  assert.equal(await pinCheck('4821', r), true); assert.equal(await pinCheck('4822', r), false);
  assert.deepEqual([2, 3, 5, 8, 20].map(pinLockMs), [0, 30000, 300000, 1800000, 7200000]);
});
test('vault: create → unlock → seal a 300 KB photo → restore on a fresh device with only the passphrase', async () => {
  await assert.rejects(vaultCreate('short'));
  const { vault, key } = await vaultCreate('correct horse battery');
  await assert.rejects(vaultOpen('wrong passphrase!!', vault));
  const key2 = await vaultOpen('correct horse battery', vault); assert.ok(key2);
  const photo = new Uint8Array(300000).map((_, i) => (i * 31) & 255);
  const env = await sealFile(key, vault, photo, { view: 'side-right' });
  assert.equal(env.kind, 'backforge-vault-file'); assert.equal(env.meta.view, 'side-right');
  assert.ok(!JSON.stringify(env).includes('correct horse'), 'no secret in the envelope');
  const out = await openFile('correct horse battery', JSON.parse(JSON.stringify(env)));   // fresh device: envelope carries salt + iterations
  assert.deepEqual(out, photo);
  await assert.rejects(openFile('wrong passphrase!!', env));
  await assert.rejects(openFile('correct horse battery', { ...env, id: 'vf-swapped' }), 'file id is bound as AAD');
});
