// Rôle : vérifie les routes publiques des lieux de bout en bout, par HTTP,
// comme le navigateur : GET /api/places et GET /api/places/:id/stations, sur
// l'application assemblée (createApp) branchée à une base jetable. Aucune
// connexion n'est demandée : on écoute sans compte (F1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { startApp, sendRequest } from '../start-app-for-tests.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';
import { upsertPlace } from '../repositories/places-repository.js';
import { upsertStations } from '../repositories/stations-repository.js';

// Station minimale ; n donne un identifiant Radio Browser et un flux uniques.
function station(n, name) {
  return {
    externalId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name,
    streamUrl: `https://stream.example/${n}`,
    homepageUrl: n === 1 ? 'https://teranga.example/' : null,
  };
}

// Démarre l'API sur une base jetable qui contient Dakar (trois stations,
// dont une masquée) et Mexico (aucune station). Reçoit le contexte du test ;
// renvoie { db, url, dakar, mexico }.
async function startPlacesApi(t) {
  const db = await startTestDatabase(t);
  const dakar = await upsertPlace(db, {
    name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar',
  });
  const mexico = await upsertPlace(db, {
    name: 'Mexico', countryCode: 'MX', countryName: 'Mexique', timezone: 'America/Mexico_City',
  });
  await upsertStations(db, dakar.id, [
    station(1, 'Radio Teranga'),
    station(2, 'Sabar FM'),
    station(3, 'Station masquée'),
  ]);
  await db.query("UPDATE stations SET status = 'hidden' WHERE name = 'Station masquée'");
  const baseUrl = await startApp(t, createApp({ db }));
  return { db, url: (path) => `${baseUrl}${path}`, dakar, mexico };
}

// Donne à une station un dernier titre lu il y a « minutesAgo » minutes.
async function setLastTitle(db, name, title, minutesAgo) {
  await db.query(
    'UPDATE stations SET last_title = $1, last_title_read_at = now() - make_interval(mins => $2) WHERE name = $3',
    [title, minutesAgo, name],
  );
}

test('GET /api/places liste, sans compte, les lieux qui ont une station active', requiresDatabase, async (t) => {
  const { url, dakar } = await startPlacesApi(t);

  const response = await sendRequest(url('/api/places'));

  assert.equal(response.status, 200);
  // Mexico n'a aucune station : absent. La station masquée n'est pas comptée.
  assert.deepEqual(response.json, {
    places: [{
      id: dakar.id,
      name: 'Dakar',
      countryCode: 'SN',
      countryName: 'Sénégal',
      timezone: 'Africa/Dakar',
      stationCount: 2,
    }],
  });
});

test('GET /api/places/:id/stations : titre récent montré, vieux titre « indisponible », station masquée absente', requiresDatabase, async (t) => {
  const { db, url, dakar } = await startPlacesApi(t);
  await setLastTitle(db, 'Radio Teranga', 'Youssou N\'Dour – Birima', 2);
  await setLastTitle(db, 'Sabar FM', 'Un titre trop vieux', 6);
  await setLastTitle(db, 'Station masquée', 'Titre caché', 1);

  const response = await sendRequest(url(`/api/places/${dakar.id}/stations`));

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.place, {
    id: dakar.id, name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar',
  });
  assert.deepEqual(
    response.json.stations.map(({ name, title }) => ({ name, title })),
    [
      { name: 'Radio Teranga', title: 'Youssou N\'Dour – Birima' },
      { name: 'Sabar FM', title: null },
    ],
  );
  const teranga = response.json.stations[0];
  assert.equal(typeof teranga.id, 'number');
  assert.equal(teranga.streamUrl, 'https://stream.example/1');
  assert.equal(teranga.homepageUrl, 'https://teranga.example/');
  assert.equal('lastTitleReadAt' in teranga, false);
});

test('GET /api/places/:id/stations d\'un lieu existant sans station active : liste vide', requiresDatabase, async (t) => {
  const { url, mexico } = await startPlacesApi(t);

  const response = await sendRequest(url(`/api/places/${mexico.id}/stations`));

  assert.equal(response.status, 200);
  assert.deepEqual(response.json.stations, []);
});

test('GET /api/places/:id/stations d\'un lieu inconnu : 404', requiresDatabase, async (t) => {
  const { url, dakar } = await startPlacesApi(t);

  const response = await sendRequest(url(`/api/places/${dakar.id + 1000}/stations`));

  assert.equal(response.status, 404);
  assert.deepEqual(response.json, { error: { message: 'Lieu introuvable', details: [] } });
});

test('GET /api/places/:id/stations refuse un identifiant qui n\'est pas un entier positif (400)', requiresDatabase, async (t) => {
  const { url } = await startPlacesApi(t);

  for (const id of ['abc', '0', '-3', '1.5', '1%20OR%201=1', '2147483648']) {
    const response = await sendRequest(url(`/api/places/${id}/stations`));
    assert.equal(response.status, 400, `identifiant ${id}`);
    assert.equal(response.json.error.message, 'Requête invalide');
    assert.equal(response.json.error.details[0].location, 'params');
    assert.equal(response.json.error.details[0].field, 'id');
  }
});
