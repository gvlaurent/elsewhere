// Rôle : vérifie la gestion d'erreurs centrale : une erreur prévue garde son
// code et son message, une erreur imprévue ne laisse rien fuiter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { errorHandler } from './error-handler.js';
import { HttpError } from '../errors/http-error.js';
import { startApp } from '../test-helpers.js';

// Fabrique une application dont la seule route lance l'erreur donnée.
function appThrowing(error) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

test('une HttpError garde son code, son message et ses détails', async (t) => {
  const error = new HttpError(404, 'Station introuvable', [{ field: 'id' }]);
  const baseUrl = await startApp(t, appThrowing(error));

  const response = await fetch(`${baseUrl}/boom`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { message: 'Station introuvable', details: [{ field: 'id' }] },
  });
});

test('une erreur imprévue répond 500 sans aucun détail interne', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const secret = new Error('connexion refusée : postgres://admin:motdepasse@db');
  const baseUrl = await startApp(t, appThrowing(secret));

  const response = await fetch(`${baseUrl}/boom`);
  const text = await response.text();

  assert.equal(response.status, 500);
  assert.deepEqual(JSON.parse(text), {
    error: { message: 'Erreur interne du serveur', details: [] },
  });
  assert.doesNotMatch(text, /postgres|motdepasse|at /);
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(logged.mock.calls[0].arguments.at(-1), secret);
});
