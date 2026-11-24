// Rôle : vérifie le middleware validate sur une route déclarée seulement
// dans ce test, en attendant les vraies routes (stations, moments…).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { z } from '../config/zod.js';
import { validate } from './validate.js';
import { errorHandler } from './error-handler.js';
import { startApp, postJson } from '../start-app-for-tests.js';

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

// Envoie un signalement de test à la petite application ; renvoie le code
// HTTP et le corps de la réponse.
async function postReport(t, path, body) {
  const baseUrl = await startApp(t, buildApp());
  return postJson(`${baseUrl}${path}`, JSON.stringify(body));
}

// Résume les détails d'erreur en paires [endroit, champ], plus faciles à comparer.
function fieldsOf(json) {
  return json.error.details.map((d) => [d.location, d.field]);
}

test('des données valides passent, converties dans le bon type', async (t) => {
  const { status, json } = await postReport(t, '/stations/42/reports?lang=fr', {
    reason: 'plus de son',
    admin: true,
  });

  assert.equal(status, 200);
  assert.deepEqual(json, {
    params: { id: 42 },
    query: { lang: 'fr' },
    body: { reason: 'plus de son' },
  });
});

test('un corps invalide répond 400 et nomme le champ fautif', async (t) => {
  const { status, json } = await postReport(t, '/stations/42/reports', { reason: 'ok' });

  assert.equal(status, 400);
  assert.equal(json.error.message, 'Requête invalide');
  assert.deepEqual(fieldsOf(json), [['body', 'reason']]);
  assert.match(json.error.details[0].message, /Trop petit/);
});

test('un paramètre d\'adresse invalide répond 400', async (t) => {
  const { status, json } = await postReport(t, '/stations/abc/reports', {
    reason: 'plus de son',
  });

  assert.equal(status, 400);
  assert.deepEqual(fieldsOf(json), [['params', 'id']]);
});

test('une requête (?…) invalide répond 400 et nomme le champ', async (t) => {
  const { status, json } = await postReport(t, '/stations/42/reports?lang=de', {
    reason: 'plus de son',
  });

  assert.equal(status, 400);
  assert.deepEqual(fieldsOf(json), [['query', 'lang']]);
});

test('un corps du mauvais type est refusé, sans champ précis', async (t) => {
  const { status, json } = await postReport(t, '/stations/42/reports', ['plus de son']);

  assert.equal(status, 400);
  assert.deepEqual(fieldsOf(json), [['body', null]]);
});

test('toutes les erreurs sont listées ensemble, pas seulement la première', async (t) => {
  const { status, json } = await postReport(t, '/stations/abc/reports?lang=de', {});

  assert.equal(status, 400);
  assert.deepEqual(fieldsOf(json), [
    ['params', 'id'],
    ['query', 'lang'],
    ['body', 'reason'],
  ]);
});
