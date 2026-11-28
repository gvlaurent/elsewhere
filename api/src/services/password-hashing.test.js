// Rôle : vérifie le hachage des mots de passe (password-hashing.js), seul,
// sans base ni serveur : le mot de passe n'est jamais gardé en clair, et
// seul le bon mot de passe correspond à son hash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password-hashing.js';

test('hashPassword produit un hash Argon2id, jamais le mot de passe', async () => {
  const hash = await hashPassword('un mot de passe solide');

  assert.match(hash, /^\$argon2id\$/);
  assert.equal(hash.includes('un mot de passe solide'), false);
});

test('deux hachages du même mot de passe diffèrent (sel aléatoire)', async () => {
  const first = await hashPassword('un mot de passe solide');
  const second = await hashPassword('un mot de passe solide');

  assert.notEqual(first, second);
});

test('verifyPassword accepte le bon mot de passe et refuse les autres', async () => {
  const hash = await hashPassword('un mot de passe solide');

  assert.equal(await verifyPassword(hash, 'un mot de passe solide'), true);
  assert.equal(await verifyPassword(hash, 'Un mot de passe solide'), false);
  assert.equal(await verifyPassword(hash, ''), false);
});
