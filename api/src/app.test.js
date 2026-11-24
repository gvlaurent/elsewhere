// Rôle : vérifie l'application Express telle qu'elle est assemblée dans
// app.js : route de santé, route inconnue et JSON mal formé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from './app.js';
import { startApp } from './test-helpers.js';

test('GET /api/health répond 200 avec { status: "ok" }', async (t) => {
  const baseUrl = await startApp(t, app);

  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('une route inconnue sous /api répond 404 en JSON', async (t) => {
  const baseUrl = await startApp(t, app);

  const response = await fetch(`${baseUrl}/api/nexiste-pas`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { message: 'Ressource introuvable', details: [] },
  });
});

test('un corps JSON mal formé répond 400', async (t) => {
  const baseUrl = await startApp(t, app);

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "name": ',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { message: 'JSON mal formé', details: [] },
  });
});

test('un corps de plus de 100 ko est refusé avec 413', async (t) => {
  const baseUrl = await startApp(t, app);

  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'a'.repeat(200_000) }),
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    error: { message: 'Requête refusée', details: [] },
  });
});
