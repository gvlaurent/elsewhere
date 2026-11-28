// Rôle : vérifie l'accès aux données des lieux (places-repository.js) sur une
// vraie base PostgreSQL, dans un schéma jetable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertPlace } from './places-repository.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

const lagos = { name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos' };

test('upsertPlace crée un lieu et renvoie son identifiant', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const place = await upsertPlace(db, lagos);

  assert.equal(typeof place.id, 'number');
  assert.equal(place.name, 'Lagos');
  assert.equal(place.timezone, 'Africa/Lagos');
});

test('upsertPlace une seconde fois : même lieu, mis à jour, sans doublon', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const first = await upsertPlace(db, lagos);

  const second = await upsertPlace(db, { ...lagos, countryName: 'République fédérale du Nigeria' });

  assert.equal(second.id, first.id);
  assert.equal(second.countryName, 'République fédérale du Nigeria');
  const { rows } = await db.query('SELECT count(*) AS total FROM places');
  assert.equal(rows[0].total, '1');
});

test('upsertPlace enregistre tel quel un nom qui ressemble à du SQL', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const tricky = "Lagos'); DROP TABLE places; --";

  const place = await upsertPlace(db, { ...lagos, name: tricky });

  assert.equal(place.name, tricky);
});
