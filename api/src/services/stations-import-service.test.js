// Rôle : vérifie le service d'importation des stations de bout en bout, sur
// une base jetable, avec un annuaire Radio Browser simulé : aucun appel
// réseau réel. Couvre le rattachement au lieu, l'absence de doublon à la
// seconde importation, et un annuaire en erreur ou trop lent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importStations } from './stations-import-service.js';
import {
  createRadioBrowserClient,
  RadioBrowserUnavailableError,
} from '../clients/radio-browser-client.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

const lagos = {
  name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos',
  stateAliases: ['Lagos'],
};
const accra = {
  name: 'Accra', countryCode: 'GH', countryName: 'Ghana', timezone: 'Africa/Accra',
  stateAliases: ['Accra'],
};

// Stations simulées, telles que les renverrait Radio Browser.
function rbStation(n, overrides) {
  return {
    stationuuid: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    name: `Station ${n}`,
    url: `https://stream.example/${n}`,
    url_resolved: `https://stream.example/${n}`,
    homepage: '',
    countrycode: 'NG',
    state: 'Lagos',
    lastcheckok: 1,
    votes: 0,
    ...overrides,
  };
}

const directory = {
  NG: [
    rbStation(1, { name: 'Cool FM', state: 'Lagos State' }),
    rbStation(2, { name: 'Beat FM' }),
    rbStation(3, { url_resolved: 'http://stream.example/3' }), // pas en HTTPS
    rbStation(4, { lastcheckok: 0 }), // hors ligne
    rbStation(5, { name: 'Cool FM', votes: -1 }), // doublon de nom
    rbStation(6, { state: 'Kano' }), // lieu inconnu
  ],
  GH: [rbStation(7, { name: 'Joy FM', countrycode: 'GH', state: 'Greater Accra' })],
};

// Faux client : répond avec l'annuaire simulé, sans réseau.
const fakeClient = {
  searchStationsByCountry: async (countryCode) => directory[countryCode] ?? [],
};

test('importe les stations, les rattache à leur lieu et rend compte de chaque écart', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const report = await importStations(db, { client: fakeClient, places: [lagos, accra] });

  assert.deepEqual(report.places, [
    {
      name: 'Lagos', countryCode: 'NG', kept: 2, inserted: 2, updated: 0, unchanged: 0,
      discarded: { offline: 1, not_https: 1, duplicate: 1 },
    },
    {
      name: 'Accra', countryCode: 'GH', kept: 1, inserted: 1, updated: 0, unchanged: 0,
      discarded: { offline: 0, not_https: 0, duplicate: 0 },
    },
  ]);
  assert.deepEqual(report.countries, [
    { countryCode: 'NG', received: 6, unknownPlace: 1, invalid: 0 },
    { countryCode: 'GH', received: 1, unknownPlace: 0, invalid: 0 },
  ]);

  const { rows } = await db.query(
    `SELECT s.name AS station, p.name AS place, p.timezone
     FROM stations s JOIN places p ON p.id = s.place_id
     ORDER BY s.name`,
  );
  assert.deepEqual(rows, [
    { station: 'Beat FM', place: 'Lagos', timezone: 'Africa/Lagos' },
    { station: 'Cool FM', place: 'Lagos', timezone: 'Africa/Lagos' },
    { station: 'Joy FM', place: 'Accra', timezone: 'Africa/Accra' },
  ]);
});

test('une seconde importation ne crée aucun doublon', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  await importStations(db, { client: fakeClient, places: [lagos, accra] });

  const report = await importStations(db, { client: fakeClient, places: [lagos, accra] });

  assert.equal(report.places[0].inserted, 0);
  assert.equal(report.places[0].unchanged, 2);
  const stations = await db.query('SELECT count(*) AS total FROM stations');
  const places = await db.query('SELECT count(*) AS total FROM places');
  assert.equal(stations.rows[0].total, '3');
  assert.equal(places.rows[0].total, '2');
});

test('un pays demandé une seule fois, même s\'il a plusieurs lieux', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const calls = [];
  const client = {
    searchStationsByCountry: async (countryCode) => {
      calls.push(countryCode);
      return directory[countryCode] ?? [];
    },
  };
  const ikeja = { ...lagos, name: 'Ikeja', stateAliases: ['Ikeja'] };

  await importStations(db, { client, places: [lagos, ikeja] });

  assert.deepEqual(calls, ['NG']);
});

test('annuaire en erreur : l\'importation échoue et la base n\'est pas touchée', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const client = createRadioBrowserClient({
    resolveServers: async () => ['de1.api.radio-browser.info'],
    fetchImpl: async () => new Response('panne', { status: 503 }),
  });

  await assert.rejects(
    importStations(db, { client, places: [lagos, accra] }),
    RadioBrowserUnavailableError,
  );
  const { rows } = await db.query('SELECT (SELECT count(*) FROM places) AS places, (SELECT count(*) FROM stations) AS stations');
  assert.deepEqual(rows[0], { places: '0', stations: '0' });
});

test('annuaire trop lent : l\'importation abandonne et le cache précédent reste intact', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  await importStations(db, { client: fakeClient, places: [lagos] });
  const slowClient = createRadioBrowserClient({
    resolveServers: async () => ['de1.api.radio-browser.info'],
    timeoutMs: 30,
    // Ne répond jamais : seul le délai maximal peut l'arrêter.
    fetchImpl: (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
  });

  await assert.rejects(
    importStations(db, { client: slowClient, places: [lagos] }),
    RadioBrowserUnavailableError,
  );
  const { rows } = await db.query('SELECT count(*) AS total FROM stations');
  assert.equal(rows[0].total, '2');
});
