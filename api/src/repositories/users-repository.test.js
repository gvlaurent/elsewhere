// Rôle : vérifie l'accès aux données des comptes (users-repository.js) sur
// une vraie base PostgreSQL, et prouve que ses requêtes sont paramétrées :
// une valeur piégée envoyée par un attaquant reste une simple valeur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUser, findUserByEmail } from './users-repository.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

const julien = {
  email: 'julien@example.com',
  passwordHash: '$argon2id$faux-hash-pour-le-test',
  consentAt: new Date('2026-11-24T10:00:00Z'),
};

test('createUser enregistre un membre et ne renvoie jamais le hash', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const user = await createUser(db, julien);

  assert.equal(typeof user.id, 'number');
  assert.equal(user.email, 'julien@example.com');
  assert.equal(user.role, 'member');
  assert.deepEqual(user.consentAt, julien.consentAt);
  assert.equal('passwordHash' in user, false);
});

test('findUserByEmail retrouve le membre, majuscules ignorées', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const created = await createUser(db, julien);

  const found = await findUserByEmail(db, 'JULIEN@example.com');

  assert.equal(found.id, created.id);
  assert.equal(found.passwordHash, julien.passwordHash);
});

test('findUserByEmail renvoie null pour un e-mail inconnu', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  await createUser(db, julien);

  assert.equal(await findUserByEmail(db, 'aminata@example.com'), null);
});

test('une valeur piégée est traitée comme une simple valeur (injection SQL)', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  await createUser(db, julien);

  // Si le texte était collé dans le SQL, la requête deviendrait
  // « WHERE lower(email) = lower('' OR 1=1 --') » : toujours vraie,
  // elle renverrait Julien. Paramétrée, elle cherche cet e-mail exact.
  const found = await findUserByEmail(db, "' OR 1=1 --");

  assert.equal(found, null);
  const { rows } = await db.query('SELECT count(*) AS total FROM users');
  assert.equal(rows[0].total, '1');
});

test('createUser enregistre tel quel un texte qui ressemble à du SQL', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const tricky = "robert'); DROP TABLE users; --@example.com";

  await createUser(db, { ...julien, email: tricky });

  const found = await findUserByEmail(db, tricky);
  assert.equal(found.email, tricky);
});
