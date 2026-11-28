// Rôle : vérifie l'accès aux données des sessions (sessions-repository.js)
// sur une vraie base PostgreSQL : une session retrouve son membre tant
// qu'elle n'a pas expiré, et disparaît à la déconnexion ou avec le compte.
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  createSession,
  findUserBySessionTokenHash,
  deleteSessionByTokenHash,
  deleteExpiredSessions,
} from './sessions-repository.js';
import { createUser } from './users-repository.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

// Fabrique une empreinte SHA-256 à partir d'un mot lisible (« telephone »),
// pour que chaque test parle de sessions reconnaissables.
const fingerprint = (label) => createHash('sha256').update(label).digest('hex');

const IN_ONE_HOUR = () => new Date(Date.now() + 60 * 60 * 1000);
const ONE_HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000);

// Crée Julien, membre de test. Reçoit le pool ; renvoie son compte.
function createJulien(db) {
  return createUser(db, {
    email: 'julien@example.com',
    passwordHash: '$argon2id$faux-hash-pour-le-test',
    consentAt: new Date('2026-11-24T10:00:00Z'),
  });
}

test('une session valide retrouve son membre, sans le hash du mot de passe', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);

  await createSession(db, { userId: julien.id, tokenHash: fingerprint('empreinte-1'), expiresAt: IN_ONE_HOUR() });
  const found = await findUserBySessionTokenHash(db, fingerprint('empreinte-1'));

  assert.equal(found.id, julien.id);
  assert.equal(found.email, 'julien@example.com');
  assert.equal(found.role, 'member');
  assert.equal('passwordHash' in found, false);
});

test('une empreinte inconnue ne retrouve personne', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('empreinte-1'), expiresAt: IN_ONE_HOUR() });

  assert.equal(await findUserBySessionTokenHash(db, fingerprint('empreinte-inconnue')), null);
});

test('une session expirée ne retrouve personne', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);

  await createSession(db, { userId: julien.id, tokenHash: fingerprint('empreinte-1'), expiresAt: ONE_HOUR_AGO() });

  assert.equal(await findUserBySessionTokenHash(db, fingerprint('empreinte-1')), null);
});

test('deleteSessionByTokenHash supprime seulement cette session', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('telephone'), expiresAt: IN_ONE_HOUR() });
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('ordinateur'), expiresAt: IN_ONE_HOUR() });

  await deleteSessionByTokenHash(db, fingerprint('telephone'));

  assert.equal(await findUserBySessionTokenHash(db, fingerprint('telephone')), null);
  assert.equal((await findUserBySessionTokenHash(db, fingerprint('ordinateur'))).id, julien.id);
});

test('deleteExpiredSessions efface les sessions expirées du membre', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('ancienne'), expiresAt: ONE_HOUR_AGO() });
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('active'), expiresAt: IN_ONE_HOUR() });

  await deleteExpiredSessions(db, julien.id);

  const { rows } = await db.query('SELECT token_hash FROM sessions');
  assert.deepEqual(rows.map((row) => row.token_hash), [fingerprint('active')]);
});

test('supprimer un compte supprime ses sessions', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const julien = await createJulien(db);
  await createSession(db, { userId: julien.id, tokenHash: fingerprint('empreinte-1'), expiresAt: IN_ONE_HOUR() });

  await db.query('DELETE FROM users WHERE id = $1', [julien.id]);

  const { rows } = await db.query('SELECT count(*) AS total FROM sessions');
  assert.equal(rows[0].total, '0');
});
