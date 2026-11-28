// Rôle : vérifie le client de Radio Browser sans jamais toucher au réseau.
// Les serveurs (DNS) et les réponses HTTP (fetch) sont simulés : le test
// décide de ce que « répond » l'annuaire, y compris une panne ou une lenteur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRadioBrowserClient, RadioBrowserUnavailableError } from './radio-browser-client.js';

const lagosStation = {
  stationuuid: '9617a958-0601-11e8-ae97-52543be04c81',
  name: 'Cool FM Lagos',
  url: 'https://stream.example/cool',
  url_resolved: 'https://stream.example/cool',
  homepage: 'https://coolfm.example',
  countrycode: 'NG',
  state: 'Lagos',
  lastcheckok: 1,
  votes: 12,
  champ_inutile: 'retiré',
};

// Fabrique une fausse réponse HTTP, comme celle que renvoie fetch.
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Faux fetch qui note chaque appel et répond avec la fonction donnée.
function fakeFetch(answer) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return answer(String(url), options);
  };
  return { fetchImpl, calls };
}

const oneServer = async () => ['de1.api.radio-browser.info'];

test('searchStationsByCountry demande les stations du pays et garde les champs utiles', async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse([lagosStation]));
  const client = createRadioBrowserClient({ fetchImpl, resolveServers: oneServer });

  const stations = await client.searchStationsByCountry('NG');

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://de1.api.radio-browser.info');
  assert.equal(url.pathname, '/json/stations/bycountrycodeexact/NG');
  assert.deepEqual(stations, [
    {
      stationuuid: lagosStation.stationuuid,
      name: 'Cool FM Lagos',
      url: 'https://stream.example/cool',
      url_resolved: 'https://stream.example/cool',
      homepage: 'https://coolfm.example',
      countrycode: 'NG',
      state: 'Lagos',
      lastcheckok: 1,
      votes: 12,
    },
  ]);
});

test('envoie un User-Agent générique, sans donnée personnelle', async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse([]));
  const client = createRadioBrowserClient({ fetchImpl, resolveServers: oneServer });

  await client.searchStationsByCountry('SN');

  assert.equal(calls[0].options.headers['User-Agent'], 'Elsewhere/0.1');
});

test('refuse un code pays mal formé avant tout appel', async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse([]));
  const client = createRadioBrowserClient({ fetchImpl, resolveServers: oneServer });

  await assert.rejects(client.searchStationsByCountry('ng/../x'), TypeError);
  assert.equal(calls.length, 0);
});

test('un serveur en erreur : le client essaie le serveur suivant', async () => {
  const { fetchImpl, calls } = fakeFetch((url) =>
    url.includes('de1.') ? jsonResponse({ error: 'panne' }, 503) : jsonResponse([lagosStation]),
  );
  const client = createRadioBrowserClient({
    fetchImpl,
    resolveServers: async () => ['de1.api.radio-browser.info', 'fi1.api.radio-browser.info'],
    shuffle: (servers) => servers, // ordre fixe pour le test
  });

  const stations = await client.searchStationsByCountry('NG');

  assert.equal(calls.length, 2);
  assert.equal(stations.length, 1);
});

test('tous les serveurs en erreur : RadioBrowserUnavailableError', async () => {
  const { fetchImpl } = fakeFetch(() => jsonResponse({ error: 'panne' }, 500));
  const client = createRadioBrowserClient({
    fetchImpl,
    resolveServers: async () => ['de1.api.radio-browser.info', 'fi1.api.radio-browser.info'],
  });

  await assert.rejects(client.searchStationsByCountry('NG'), RadioBrowserUnavailableError);
});

test('un annuaire trop lent est abandonné après le délai maximal', async () => {
  // Ce faux fetch ne répond jamais : il attend que le signal d'abandon
  // (AbortSignal) se déclenche, comme le vrai fetch.
  const fetchImpl = (url, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  const client = createRadioBrowserClient({ fetchImpl, resolveServers: oneServer, timeoutMs: 30 });

  const started = Date.now();
  await assert.rejects(client.searchStationsByCountry('NG'), RadioBrowserUnavailableError);
  assert.ok(Date.now() - started < 2000, 'le client ne doit pas attendre indéfiniment');
});

test('une réponse qui n\'est pas une liste est refusée', async () => {
  const { fetchImpl } = fakeFetch(() => jsonResponse({ inattendu: true }));
  const client = createRadioBrowserClient({ fetchImpl, resolveServers: oneServer });

  await assert.rejects(client.searchStationsByCountry('NG'), RadioBrowserUnavailableError);
});

test('aucun serveur trouvé dans le DNS : RadioBrowserUnavailableError', async () => {
  const { fetchImpl, calls } = fakeFetch(() => jsonResponse([]));
  const client = createRadioBrowserClient({
    fetchImpl,
    resolveServers: async () => {
      throw new Error('ENOTFOUND');
    },
  });

  await assert.rejects(client.searchStationsByCountry('NG'), RadioBrowserUnavailableError);
  assert.equal(calls.length, 0);
});
