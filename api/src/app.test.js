// Rôle : vérifie que l'application Express répond sur sa route de santé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from './app.js';

test('GET /api/health répond 200 avec { status: "ok" }', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => server.close());
  const { port } = server.address();

  const response = await fetch(`http://localhost:${port}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});