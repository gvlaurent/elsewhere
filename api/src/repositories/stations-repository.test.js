// Rôle : vérifie l'accès aux données des stations (stations-repository.js)
// sur une vraie base PostgreSQL, dans un schéma jetable : insertion ou mise
// à jour sans doublon, statut d'admin respecté, requêtes paramétrées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upsertStations } from './stations-repository.js';
import { upsertPlace } from './places-repository.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

const coolFm = {
  externalId: '9617a958-0601-11e8-ae97-52543be04c81',
  name: 'Cool FM',
  streamUrl: 'https://stream.example/cool',
  homepageUrl: 'https://coolfm.example/',
};
const rhythm = {
  externalId: '0b1d1a2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
  name: 'Rhythm 93.7',
  streamUrl: 'https://stream.example/rhythm',
  homepageUrl: null,
};

// Prépare une base jetable avec le lieu Lagos. Renvoie { db, placeId }.
async function setup(t) {
  const db = await startTestDatabase(t);
  const place = await upsertPlace(db, {
    name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos',
  });
  return { db, placeId: place.id };
}

test('upsertStations insère les nouvelles stations et les compte', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);

  const result = await upsertStations(db, placeId, [coolFm, rhythm]);

  assert.deepEqual(result, { inserted: 2, updated: 0 });
  const { rows } = await db.query(
    'SELECT external_id, place_id, name, stream_url, homepage_url, status FROM stations ORDER BY name',
  );
  assert.deepEqual(rows, [
    {
      external_id: coolFm.externalId, place_id: placeId, name: 'Cool FM',
      stream_url: coolFm.streamUrl, homepage_url: coolFm.homepageUrl, status: 'active',
    },
    {
      external_id: rhythm.externalId, place_id: placeId, name: 'Rhythm 93.7',
      stream_url: rhythm.streamUrl, homepage_url: null, status: 'active',
    },
  ]);
});

test('une seconde importation identique ne crée aucun doublon et ne modifie rien', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);
  await upsertStations(db, placeId, [coolFm, rhythm]);

  const result = await upsertStations(db, placeId, [coolFm, rhythm]);

  assert.deepEqual(result, { inserted: 0, updated: 0 });
  const { rows } = await db.query('SELECT count(*) AS total FROM stations');
  assert.equal(rows[0].total, '2');
});

test('une station déjà connue qui a changé est mise à jour (ON CONFLICT)', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);
  await upsertStations(db, placeId, [coolFm]);

  const result = await upsertStations(db, placeId, [
    { ...coolFm, name: 'Cool FM 96.9', streamUrl: 'https://stream.example/cool-hd' },
  ]);

  assert.deepEqual(result, { inserted: 0, updated: 1 });
  const { rows } = await db.query('SELECT name, stream_url FROM stations');
  assert.deepEqual(rows, [{ name: 'Cool FM 96.9', stream_url: 'https://stream.example/cool-hd' }]);
});

test('une station masquée par un admin le reste après la mise à jour (C10)', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);
  await upsertStations(db, placeId, [coolFm]);
  await db.query("UPDATE stations SET status = 'hidden' WHERE external_id = $1", [coolFm.externalId]);

  await upsertStations(db, placeId, [{ ...coolFm, name: 'Cool FM 96.9' }]);

  const { rows } = await db.query('SELECT status FROM stations');
  assert.equal(rows[0].status, 'hidden');
});

test('une liste vide ne lance aucune requête et renvoie zéro', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);

  assert.deepEqual(await upsertStations(db, placeId, []), { inserted: 0, updated: 0 });
});

test('un nom qui ressemble à du SQL est enregistré tel quel (injection SQL)', requiresDatabase, async (t) => {
  const { db, placeId } = await setup(t);
  const tricky = "Radio'); DROP TABLE stations; --";

  await upsertStations(db, placeId, [{ ...coolFm, name: tricky }]);

  const { rows } = await db.query('SELECT name FROM stations');
  assert.deepEqual(rows, [{ name: tricky }]);
});
