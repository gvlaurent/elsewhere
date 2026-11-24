// Rôle : vérifie le middleware validate sur une route déclarée seulement
// dans ce test, en attendant les vraies routes (stations, moments…).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { z } from 'zod';
import { validate } from './validate.js';
import { errorHandler } from './error-handler.js';
import { startApp } from '../test-helpers.js';

// Fabrique une petite application avec une seule route validée, qui renvoie
// telles quelles les données acceptées par validate.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/stations/:id/reports',
    validate({
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({ lang: z.enum(['fr', 'en']).optional() }),
      body: z.object({ reason: z.string().min(3) }),
    }),
    (req, res) => res.json(req.validated),
  );
  app.use(errorHandler);
  return app;
}

// Envoie un signalement de test ; renvoie la réponse et son corps lu.
async function postReport(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

test('des données valides passent, converties dans le bon type', async (t) => {
  const baseUrl = await startApp(t, buildApp());

  const { status, json } = await postReport(baseUrl, '/stations/42/reports?lang=fr', {
    reason: 'plus de son',
  });

  assert.equal(status, 200);
  assert.deepEqual(json, {
    params: { id: 42 },
    query: { lang: 'fr' },
    body: { reason: 'plus de son' },
  });
});

test('un corps invalide répond 400 et nomme le champ fautif', async (t) => {
  const baseUrl = await startApp(t, buildApp());

  const { status, json } = await postReport(baseUrl, '/stations/42/reports', { reason: 'ok' });

  assert.equal(status, 400);
  assert.equal(json.error.message, 'Requête invalide');
  assert.equal(json.error.details.length, 1);
  assert.equal(json.error.details[0].location, 'body');
  assert.equal(json.error.details[0].field, 'reason');
  assert.match(json.error.details[0].message, /Trop petit/);
});

test('un paramètre d\'adresse invalide répond 400', async (t) => {
  const baseUrl = await startApp(t, buildApp());

  const { status, json } = await postReport(baseUrl, '/stations/abc/reports', {
    reason: 'plus de son',
  });

  assert.equal(status, 400);
  assert.deepEqual(
    json.error.details.map((d) => [d.location, d.field]),
    [['params', 'id']],
  );
});

test('toutes les erreurs sont listées ensemble, pas seulement la première', async (t) => {
  const baseUrl = await startApp(t, buildApp());

  const { status, json } = await postReport(baseUrl, '/stations/abc/reports?lang=de', {});

  assert.equal(status, 400);
  assert.deepEqual(
    json.error.details.map((d) => d.location).sort(),
    ['body', 'params', 'query'],
  );
});
