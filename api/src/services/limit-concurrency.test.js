// Rôle : vérifie le limiteur de tâches simultanées (limit-concurrency.js) :
// jamais plus de N tâches en même temps, les autres attendent leur tour,
// et une tâche en échec libère quand même sa place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitConcurrency } from './limit-concurrency.js';

// Tâche de test qui dure quelques millisecondes et note combien de tâches
// tournent en même temps. Reçoit le compteur partagé ; renvoie la tâche.
function trackedTask(counter) {
  return async () => {
    counter.running += 1;
    counter.peak = Math.max(counter.peak, counter.running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    counter.running -= 1;
    return 'fait';
  };
}

test('au plus 2 tâches tournent en même temps, et toutes finissent', async () => {
  const run = limitConcurrency(2);
  const counter = { running: 0, peak: 0 };

  const results = await Promise.all(
    Array.from({ length: 7 }, () => run(trackedTask(counter))),
  );

  assert.equal(counter.peak, 2);
  assert.deepEqual(results, Array(7).fill('fait'));
});

test('une tâche en échec transmet son erreur et libère sa place', async () => {
  const run = limitConcurrency(1);

  await assert.rejects(run(async () => { throw new Error('panne'); }), /panne/);

  assert.equal(await run(async () => 'suivante'), 'suivante');
});
