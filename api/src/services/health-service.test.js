// Rôle : teste le service de santé seul, sans serveur ni HTTP, pour montrer
// que la logique métier se vérifie indépendamment des autres couches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHealthStatus } from './health-service.js';

test('getHealthStatus renvoie { status: "ok" }', () => {
  assert.deepEqual(getHealthStatus(), { status: 'ok' });
});
