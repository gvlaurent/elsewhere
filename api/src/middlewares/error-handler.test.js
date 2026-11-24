// Rôle : vérifie la gestion d'erreurs centrale : une erreur prévue garde son
// code et son message, une erreur imprévue ne laisse rien fuiter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { errorHandler } from './error-handler.js';
import { HttpError } from '../errors/http-error.js';
import { startApp } from '../start-app-for-tests.js';

// Fabrique une application dont la seule route lance l'erreur donnée, et
// renvoie la réponse obtenue sur cette route (code et texte brut).
async function responseToError(t, error) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  const baseUrl = await startApp(t, app);
  const response = await fetch(`${baseUrl}/boom`);
  return { status: response.status, text: await response.text() };
}

test('une HttpError garde son code, son message et ses détails', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const error = new HttpError(404, 'Station introuvable', [{ field: 'id' }]);

  const { status, text } = await responseToError(t, error);

  assert.equal(status, 404);
  assert.deepEqual(JSON.parse(text), {
    error: { message: 'Station introuvable', details: [{ field: 'id' }] },
  });
  assert.equal(logged.mock.callCount(), 0);
});

test('une HttpError 5xx est aussi journalisée', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const error = new HttpError(503, 'Service momentanément indisponible');

  const { status } = await responseToError(t, error);

  assert.equal(status, 503);
  assert.equal(logged.mock.callCount(), 1);
});

test('une erreur imprévue répond 500 sans aucun détail interne', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const secret = new Error('connexion refusée : postgres://admin:motdepasse@db');

  const { status, text } = await responseToError(t, secret);

  assert.equal(status, 500);
  assert.deepEqual(JSON.parse(text), {
    error: { message: 'Erreur interne du serveur', details: [] },
  });
  assert.doesNotMatch(text, /postgres|motdepasse|at /);
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(logged.mock.calls[0].arguments.at(-1), secret);
});

test('un code 4xx posé par une autre bibliothèque reste une erreur imprévue', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const foreign = Object.assign(new Error('jeton expiré pour admin@exemple.fr'), { status: 401 });

  const { status, text } = await responseToError(t, foreign);

  assert.equal(status, 500);
  assert.doesNotMatch(text, /jeton|admin@/);
  assert.equal(logged.mock.callCount(), 1);
});
