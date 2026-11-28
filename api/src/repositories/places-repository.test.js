// Rôle : vérifie l'accès aux données des lieux (places-repository.js) sur une
// vraie base PostgreSQL, dans un schéma jetable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPlaceById, findPlacesWithActiveStations, upsertPlace } from './places-repository.js';
import { upsertStations } from './stations-repository.js';
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

// --- Lecture des lieux (ELS-23) ---

// Station minimale pour les tests de lecture ; n donne un identifiant
// Radio Browser et un flux uniques.
function station(n, name) {
  return {
    externalId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name,
    streamUrl: `https://stream.example/${n}`,
    homepageUrl: null,
  };
}

test('findPlacesWithActiveStations compte les stations actives, trie par nom et écarte les lieux vides', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const lagosPlace = await upsertPlace(db, lagos);
  const accra = await upsertPlace(db, { name: 'Accra', countryCode: 'GH', countryName: 'Ghana', timezone: 'Africa/Accra' });
  // Dakar n'a qu'une station, masquée : il ne doit pas apparaître.
  const dakar = await upsertPlace(db, { name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar' });
  // Mexico n'a aucune station.
  await upsertPlace(db, { name: 'Mexico', countryCode: 'MX', countryName: 'Mexique', timezone: 'America/Mexico_City' });
  await upsertStations(db, lagosPlace.id, [station(1, 'Cool FM'), station(2, 'Rhythm'), station(3, 'Wazobia')]);
  await upsertStations(db, accra.id, [station(4, 'Joy FM')]);
  await upsertStations(db, dakar.id, [station(5, 'Sabar FM')]);
  await db.query("UPDATE stations SET status = 'hidden' WHERE name IN ('Wazobia', 'Sabar FM')");

  const places = await findPlacesWithActiveStations(db);

  assert.deepEqual(places, [
    { id: accra.id, name: 'Accra', countryCode: 'GH', countryName: 'Ghana', timezone: 'Africa/Accra', stationCount: 1 },
    { id: lagosPlace.id, name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos', stationCount: 2 },
  ]);
});

test('findPlaceById renvoie le lieu, ou null s\'il n\'existe pas', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const saved = await upsertPlace(db, lagos);

  assert.deepEqual(await findPlaceById(db, saved.id), { id: saved.id, ...lagos });
  assert.equal(await findPlaceById(db, saved.id + 1000), null);
});
