// Rôle : vérifie les moments de bout en bout, par HTTP, comme le navigateur
// (F5, F6) : garder, lister et supprimer, sur l'application assemblée
// (createApp) branchée à une base jetable. C'est ici que vivent les tests
// d'accès : sans session (401), et d'un membre à l'autre (404).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { startApp, sendRequest } from '../start-app-for-tests.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';
import { upsertPlace } from '../repositories/places-repository.js';
import { upsertStations } from '../repositories/stations-repository.js';

const PASSWORD = 'radio de Lagos le soir';

// Démarre l'API sur une base jetable qui contient le lieu Lagos, la station
// Cool FM (titre lu il y a une minute) et un thème au slug propre au test.
// Renvoie { db, url, stationId, themeId } ; url complète un chemin
// (« /api/moments ») en adresse complète.
async function startMomentsApi(t) {
  const db = await startTestDatabase(t);
  const baseUrl = await startApp(t, createApp({ db }));
  const place = await upsertPlace(db, {
    name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos',
  });
  await upsertStations(db, place.id, [{
    externalId: '9617a958-0601-11e8-ae97-52543be04c81',
    name: 'Cool FM',
    streamUrl: 'https://stream.example/cool',
    homepageUrl: null,
  }]);
  // Le titre est écrit avec l'heure de la base, moins une minute : il est
  // « récent » au sens de la règle des 5 minutes.
  const { rows: [station] } = await db.query(
    `UPDATE stations
     SET last_title = 'Fela Kuti - Zombie', last_title_read_at = now() - interval '1 minute'
     RETURNING id`,
  );
  const { rows: [theme] } = await db.query(
    "INSERT INTO themes (slug, name) VALUES ('theme-de-test-moments', 'Highlife de test') RETURNING id",
  );
  return { db, url: (path) => `${baseUrl}${path}`, stationId: station.id, themeId: theme.id };
}

// Inscrit un membre et renvoie son cookie de session (« nom=valeur »).
async function signUp(url, email) {
  const response = await sendRequest(url('/api/auth/register'), {
    method: 'POST',
    body: { email, password: PASSWORD, consent: true },
  });
  assert.equal(response.status, 201);
  return response.setCookies[0].split(';')[0];
}

// Garde un moment pour le membre de ce cookie. Renvoie la réponse.
function keep(url, cookie, body) {
  return sendRequest(url('/api/moments'), { method: 'POST', cookie, body });
}

test('sans session, garder, lister et supprimer répondent 401', requiresDatabase, async (t) => {
  const { db, url, stationId } = await startMomentsApi(t);

  const kept = await keep(url, undefined, { stationId });
  const listed = await sendRequest(url('/api/moments'));
  const deleted = await sendRequest(url('/api/moments/1'), { method: 'DELETE' });

  assert.deepEqual([kept.status, listed.status, deleted.status], [401, 401, 401]);
  assert.equal(listed.json.error.message, 'Connexion requise');
  const { rows } = await db.query('SELECT count(*) AS total FROM moments');
  assert.equal(rows[0].total, '0');
});

test('garder un moment avec un thème : 201 et le moment en camelCase, sans user_id', requiresDatabase, async (t) => {
  const { url, stationId, themeId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');

  const response = await keep(url, julien, { stationId, themeId });

  assert.equal(response.status, 201);
  const moment = response.json.moment;
  assert.deepEqual(Object.keys(moment).sort(), [
    'countryCode', 'countryName', 'id', 'keptAt', 'localTime', 'placeName',
    'stationId', 'stationName', 'themeId', 'themeName', 'trackTitle',
  ]);
  assert.equal(moment.stationId, stationId);
  assert.equal(moment.stationName, 'Cool FM');
  assert.equal(moment.placeName, 'Lagos');
  assert.equal(moment.countryCode, 'NG');
  assert.equal(moment.countryName, 'Nigeria');
  assert.equal(moment.themeId, themeId);
  assert.equal(moment.themeName, 'Highlife de test');
  assert.equal(moment.trackTitle, 'Fela Kuti - Zombie');
  assert.ok(Math.abs(Date.now() - Date.parse(moment.keptAt)) < 60_000);
  // Lagos est à UTC+1 toute l'année : l'heure locale a une heure d'avance.
  const expectedLocal = new Date(Date.parse(moment.keptAt) + 3_600_000).toISOString().slice(0, 19);
  assert.equal(moment.localTime, expectedLocal);
});

test('garder un moment sans thème : themeId et themeName sont null', requiresDatabase, async (t) => {
  const { url, stationId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');

  const response = await keep(url, julien, { stationId });

  assert.equal(response.status, 201);
  assert.equal(response.json.moment.themeId, null);
  assert.equal(response.json.moment.themeName, null);
});

test('un titre lu il y a plus de 5 minutes n\'est pas gardé : trackTitle est null', requiresDatabase, async (t) => {
  const { db, url, stationId } = await startMomentsApi(t);
  await db.query("UPDATE stations SET last_title_read_at = now() - interval '6 minutes'");
  const julien = await signUp(url, 'julien@example.com');

  const response = await keep(url, julien, { stationId });

  assert.equal(response.status, 201);
  assert.equal(response.json.moment.trackTitle, null);
});

test('le titre envoyé par le navigateur est ignoré : seul le serveur le lit', requiresDatabase, async (t) => {
  const { url, stationId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');

  const response = await keep(url, julien, { stationId, trackTitle: 'Titre inventé', localTime: '2000-01-01T00:00:00' });

  assert.equal(response.status, 201);
  assert.equal(response.json.moment.trackTitle, 'Fela Kuti - Zombie');
  assert.notEqual(response.json.moment.localTime, '2000-01-01T00:00:00');
});

test('une station masquée, inconnue, ou un thème inconnu : 404, rien n\'est gardé', requiresDatabase, async (t) => {
  const { db, url, stationId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');

  const unknownStation = await keep(url, julien, { stationId: 999_999 });
  const unknownTheme = await keep(url, julien, { stationId, themeId: 999_999 });
  await db.query("UPDATE stations SET status = 'hidden'");
  const hidden = await keep(url, julien, { stationId });

  assert.equal(unknownStation.status, 404);
  assert.equal(unknownStation.json.error.message, 'Station introuvable');
  assert.equal(unknownTheme.status, 404);
  assert.equal(unknownTheme.json.error.message, 'Thème introuvable');
  assert.equal(hidden.status, 404);
  assert.equal(hidden.json.error.message, 'Station introuvable');
  const { rows } = await db.query('SELECT count(*) AS total FROM moments');
  assert.equal(rows[0].total, '0');
});

test('une entrée invalide est refusée avec 400 et ses champs fautifs', requiresDatabase, async (t) => {
  const { url } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');

  const wrongTypes = await keep(url, julien, { stationId: 'abc', themeId: 0 });
  const missing = await keep(url, julien, {});
  // Au-delà du plus grand entier de PostgreSQL : refusé avant d'atteindre la base.
  const tooBig = await keep(url, julien, { stationId: 2_147_483_648 });
  const badId = await sendRequest(url('/api/moments/abc'), { method: 'DELETE', cookie: julien });

  assert.equal(wrongTypes.status, 400);
  assert.deepEqual(wrongTypes.json.error.details.map((d) => d.field), ['stationId', 'themeId']);
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.json.error.details.map((d) => d.field), ['stationId']);
  assert.equal(tooBig.status, 400);
  assert.equal(badId.status, 400);
  assert.deepEqual(badId.json.error.details.map((d) => d.field), ['id']);
});

test('lister renvoie les moments du membre, du plus récent au plus ancien', requiresDatabase, async (t) => {
  const { url, stationId, themeId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');
  const first = await keep(url, julien, { stationId });
  const second = await keep(url, julien, { stationId, themeId });

  const response = await sendRequest(url('/api/moments'), { cookie: julien });

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.json.moments.map((m) => m.id),
    [second.json.moment.id, first.json.moment.id],
  );
  assert.equal('userId' in response.json.moments[0], false);
});

test('supprimer son moment : 204, puis il n\'est plus listé', requiresDatabase, async (t) => {
  const { url, stationId } = await startMomentsApi(t);
  const julien = await signUp(url, 'julien@example.com');
  const kept = await keep(url, julien, { stationId });

  const response = await sendRequest(url(`/api/moments/${kept.json.moment.id}`), { method: 'DELETE', cookie: julien });

  assert.equal(response.status, 204);
  assert.equal(response.json, null);
  const listed = await sendRequest(url('/api/moments'), { cookie: julien });
  assert.deepEqual(listed.json.moments, []);
});

test('un membre B ne peut ni lister ni supprimer les moments d\'un membre A', requiresDatabase, async (t) => {
  const { url, stationId } = await startMomentsApi(t);
  const aminata = await signUp(url, 'aminata@example.com');
  const julien = await signUp(url, 'julien@example.com');
  const ofAminata = await keep(url, aminata, { stationId });
  const momentPath = `/api/moments/${ofAminata.json.moment.id}`;

  const listedByJulien = await sendRequest(url('/api/moments'), { cookie: julien });
  const deletedByJulien = await sendRequest(url(momentPath), { method: 'DELETE', cookie: julien });
  const missing = await sendRequest(url('/api/moments/999999'), { method: 'DELETE', cookie: julien });

  assert.deepEqual(listedByJulien.json.moments, []);
  // Le moment d'un autre et un moment qui n'existe pas : réponses identiques.
  assert.equal(deletedByJulien.status, 404);
  assert.deepEqual(deletedByJulien.json, missing.json);
  assert.deepEqual(deletedByJulien.json, { error: { message: 'Moment introuvable', details: [] } });
  const listedByAminata = await sendRequest(url('/api/moments'), { cookie: aminata });
  assert.deepEqual(listedByAminata.json.moments.map((m) => m.id), [ofAminata.json.moment.id]);
});
