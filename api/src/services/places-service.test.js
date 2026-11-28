// Rôle : vérifie le service des lieux (places-service.js) seul, sans base
// ni serveur : les repositories sont remplacés par des fonctions simulées.
// On y prouve la règle du titre (récent, ou « titre indisponible ») et le
// lieu inconnu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPlaceBoard, listPlaces } from './places-service.js';
import { HttpError } from '../errors/http-error.js';

const NOW = new Date('2026-11-28T21:58:00Z');
const DAKAR = { id: 1, name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar' };

// Station telle que la renvoie le repository, avec son dernier titre lu.
function stationRow(id, name, lastTitle, minutesAgo) {
  return {
    id,
    name,
    streamUrl: `https://stream.example/${id}`,
    homepageUrl: null,
    lastTitle,
    lastTitleReadAt: minutesAgo === null ? null : new Date(NOW.getTime() - minutesAgo * 60 * 1000),
  };
}

// Repositories simulés : chaque fonction renvoie ce que le test a prévu et
// note l'identifiant demandé.
function fakeRepositories({ places = [], place = DAKAR, stations = [] } = {}) {
  const calls = [];
  return {
    calls,
    findPlacesWithActiveStations: async (db) => {
      calls.push(['places', db]);
      return places;
    },
    findPlaceById: async (db, id) => {
      calls.push(['place', id]);
      return place;
    },
    findActiveStationsByPlace: async (db, placeId) => {
      calls.push(['stations', placeId]);
      return stations;
    },
  };
}

test('listPlaces renvoie les lieux tels que le repository les donne', async () => {
  const places = [{ ...DAKAR, stationCount: 7 }];
  const repositories = fakeRepositories({ places });

  assert.deepEqual(await listPlaces('pool', { repositories }), places);
  assert.deepEqual(repositories.calls, [['places', 'pool']]);
});

test('le tableau du direct montre le titre lu il y a moins de 5 minutes', async () => {
  const repositories = fakeRepositories({
    stations: [stationRow(10, 'Radio Teranga', 'Youssou N\'Dour – Birima', 2)],
  });

  const board = await getPlaceBoard('pool', 1, { repositories, now: NOW });

  assert.deepEqual(board, {
    place: DAKAR,
    stations: [{
      id: 10,
      name: 'Radio Teranga',
      streamUrl: 'https://stream.example/10',
      homepageUrl: null,
      title: 'Youssou N\'Dour – Birima',
    }],
  });
});

test('un titre lu il y a plus de 5 minutes, ou jamais lu, est « titre indisponible » (null)', async () => {
  const repositories = fakeRepositories({
    stations: [
      stationRow(11, 'Sabar FM', 'Vieux titre', 6),
      stationRow(12, 'Corniche Radio', null, null),
    ],
  });

  const board = await getPlaceBoard('pool', 1, { repositories, now: NOW });

  assert.deepEqual(board.stations.map((s) => s.title), [null, null]);
  // L'heure de lecture et le titre brut ne sortent jamais du service.
  for (const station of board.stations) {
    assert.equal('lastTitle' in station, false);
    assert.equal('lastTitleReadAt' in station, false);
  }
});

test('un lieu inconnu lève une HttpError 404, sans chercher ses stations', async () => {
  const repositories = fakeRepositories({ place: null });

  await assert.rejects(
    getPlaceBoard('pool', 999, { repositories, now: NOW }),
    (error) => error instanceof HttpError && error.status === 404 && error.message === 'Lieu introuvable',
  );
  assert.deepEqual(repositories.calls, [['place', 999]]);
});

test('un lieu sans station active a un tableau vide', async () => {
  const board = await getPlaceBoard('pool', 1, { repositories: fakeRepositories(), now: NOW });

  assert.deepEqual(board, { place: DAKAR, stations: [] });
});
