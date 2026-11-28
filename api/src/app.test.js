// Rôle : vérifie l'application Express telle qu'elle est assemblée dans
// app.js : route de santé, route inconnue et lecture du corps JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { startApp, postJson } from './start-app-for-tests.js';

test('GET /api/health répond 200 avec { status: "ok" }', async (t) => {
  const baseUrl = await startApp(t, createApp());

  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('une route inconnue sous /api répond 404 en JSON', async (t) => {
  const baseUrl = await startApp(t, createApp());

  const response = await fetch(`${baseUrl}/api/nexiste-pas`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { message: 'Ressource introuvable', details: [] },
  });
});

test('un corps JSON mal formé répond 400', async (t) => {
  const baseUrl = await startApp(t, createApp());

  const { status, json } = await postJson(`${baseUrl}/api/health`, '{ "name": ');

  assert.equal(status, 400);
  assert.deepEqual(json, { error: { message: 'JSON mal formé', details: [] } });
});

test('un corps de plus de 100 ko est refusé avec 413', async (t) => {
  const baseUrl = await startApp(t, createApp());
  const bigBody = JSON.stringify({ text: 'a'.repeat(200_000) });

  const { status, json } = await postJson(`${baseUrl}/api/health`, bigBody);

  assert.equal(status, 413);
  assert.deepEqual(json, { error: { message: 'Requête refusée', details: [] } });
});

test('un encodage de caractères inconnu est refusé avec 415', async (t) => {
  const baseUrl = await startApp(t, createApp());

  const { status, json } = await postJson(
    `${baseUrl}/api/health`,
    '{}',
    'application/json; charset=latin9',
  );

  assert.equal(status, 415);
  assert.deepEqual(json, { error: { message: 'Requête refusée', details: [] } });
});
