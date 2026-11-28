// Rôle : vérifie les règles des moments (moments-service.js) sans base ni
// serveur : les repositories sont remplacés par des faux, qui notent ce
// qu'on leur demande. On teste ainsi seulement les décisions du service :
// 404, titre gardé ou non, copies, accès propriétaire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteMoment, keepMoment, listMoments } from './moments-service.js';
import { HttpError } from '../errors/http-error.js';

const NOW = new Date('2026-11-28T20:30:00Z');
const DB = { fake: 'pool' };

const COOL_FM = {
  id: 7,
  name: 'Cool FM',
  status: 'active',
  lastTitle: 'Fela Kuti - Zombie',
  lastTitleReadAt: new Date('2026-11-28T20:29:00Z'), // il y a 1 minute
  placeName: 'Lagos',
  countryCode: 'NG',
  countryName: 'Nigeria',
  timezone: 'Africa/Lagos',
};

// Fabrique de faux repositories. Reçoit ce que la « base » contient :
// { station, theme, deleted } ; renvoie { repositories, calls } où calls
// garde chaque appel reçu, pour vérifier ce que le service a demandé.
function fakeRepositories({ station = COOL_FM, theme = null, deleted = true } = {}) {
  const calls = {};
  const record = (name, value) => (...args) => {
    calls[name] = args;
    return value(...args);
  };
  const repositories = {
    findStationWithPlace: record('findStationWithPlace', () => station),
    findThemeById: record('findThemeById', () => theme),
    createMoment: record('createMoment', (db, moment) => ({ id: 1, ...moment })),
    listMomentsOfUser: record('listMomentsOfUser', () => [{ id: 2 }, { id: 1 }]),
    deleteMomentOfUser: record('deleteMomentOfUser', () => deleted),
  };
  return { repositories, calls };
}

// Vérifie qu'une promesse échoue avec une HttpError de ce code et ce message.
async function assertHttpError(promise, status, message) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  });
}

test('keepMoment sans thème copie la station, le lieu et le titre récent', async () => {
  const { repositories, calls } = fakeRepositories();

  await keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW });

  assert.deepEqual(calls.findStationWithPlace, [DB, 7]);
  assert.equal(calls.findThemeById, undefined);
  assert.deepEqual(calls.createMoment, [DB, {
    userId: 42,
    stationId: 7,
    themeId: null,
    stationName: 'Cool FM',
    placeName: 'Lagos',
    countryCode: 'NG',
    countryName: 'Nigeria',
    themeName: null,
    trackTitle: 'Fela Kuti - Zombie',
    keptAt: NOW,
    timezone: 'Africa/Lagos',
  }]);
});

test('keepMoment avec un thème copie aussi son nom', async () => {
  const { repositories, calls } = fakeRepositories({ theme: { id: 3, name: 'Highlife' } });

  await keepMoment(DB, 42, { stationId: 7, themeId: 3 }, { repositories, now: NOW });

  assert.deepEqual(calls.findThemeById, [DB, 3]);
  assert.equal(calls.createMoment[1].themeId, 3);
  assert.equal(calls.createMoment[1].themeName, 'Highlife');
});

test('keepMoment renvoie le moment créé par le repository', async () => {
  const { repositories } = fakeRepositories();

  const moment = await keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW });

  assert.equal(moment.id, 1);
});

test('un titre lu il y a plus de 5 minutes n\'est pas gardé', async () => {
  const station = { ...COOL_FM, lastTitleReadAt: new Date('2026-11-28T20:24:00Z') }; // il y a 6 min
  const { repositories, calls } = fakeRepositories({ station });

  await keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW });

  assert.equal(calls.createMoment[1].trackTitle, null);
});

test('une station sans titre lu donne un moment sans titre', async () => {
  const station = { ...COOL_FM, lastTitle: null, lastTitleReadAt: null };
  const { repositories, calls } = fakeRepositories({ station });

  await keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW });

  assert.equal(calls.createMoment[1].trackTitle, null);
});

test('une station inconnue : 404, rien n\'est enregistré', async () => {
  const { repositories, calls } = fakeRepositories({ station: null });

  await assertHttpError(keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW }), 404, 'Station introuvable');
  assert.equal(calls.createMoment, undefined);
});

test('une station masquée par un admin : même 404, rien n\'est enregistré', async () => {
  const { repositories, calls } = fakeRepositories({ station: { ...COOL_FM, status: 'hidden' } });

  await assertHttpError(keepMoment(DB, 42, { stationId: 7 }, { repositories, now: NOW }), 404, 'Station introuvable');
  assert.equal(calls.createMoment, undefined);
});

test('un thème inconnu : 404, rien n\'est enregistré', async () => {
  const { repositories, calls } = fakeRepositories({ theme: null });

  await assertHttpError(
    keepMoment(DB, 42, { stationId: 7, themeId: 99 }, { repositories, now: NOW }),
    404,
    'Thème introuvable',
  );
  assert.equal(calls.createMoment, undefined);
});

test('listMoments ne demande que les moments du membre connecté', async () => {
  const { repositories, calls } = fakeRepositories();

  const moments = await listMoments(DB, 42, { repositories });

  assert.deepEqual(calls.listMomentsOfUser, [DB, 42]);
  assert.deepEqual(moments, [{ id: 2 }, { id: 1 }]);
});

test('deleteMoment supprime en filtrant par membre', async () => {
  const { repositories, calls } = fakeRepositories({ deleted: true });

  await deleteMoment(DB, 42, 5, { repositories });

  assert.deepEqual(calls.deleteMomentOfUser, [DB, { userId: 42, momentId: 5 }]);
});

test('deleteMoment d\'un moment absent ou d\'un autre membre : le même 404', async () => {
  const { repositories } = fakeRepositories({ deleted: false });

  await assertHttpError(deleteMoment(DB, 42, 5, { repositories }), 404, 'Moment introuvable');
});
