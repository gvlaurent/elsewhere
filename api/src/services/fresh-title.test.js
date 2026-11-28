// Rôle : vérifie la règle « jamais de faux titre » à la lecture
// (fresh-title.js) : un titre n'est rendu que s'il a été lu il y a moins de
// 5 minutes. Test pur, sans base ni réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshTitle, TITLE_MAX_AGE_MS } from './fresh-title.js';

const NOW = new Date('2026-11-28T20:30:00Z');

// Renvoie l'instant situé « ms » millisecondes avant NOW.
function ago(ms) {
  return new Date(NOW.getTime() - ms);
}

test('un titre lu il y a une minute est rendu', () => {
  assert.equal(freshTitle('Fela Kuti - Zombie', ago(60_000), NOW), 'Fela Kuti - Zombie');
});

test('un titre lu il y a plus de 5 minutes est indisponible (null)', () => {
  assert.equal(freshTitle('Fela Kuti - Zombie', ago(6 * 60_000), NOW), null);
});

test('la limite est stricte : exactement 5 minutes, c\'est trop vieux', () => {
  assert.equal(freshTitle('Fela Kuti - Zombie', ago(TITLE_MAX_AGE_MS), NOW), null);
  assert.equal(freshTitle('Fela Kuti - Zombie', ago(TITLE_MAX_AGE_MS - 1), NOW), 'Fela Kuti - Zombie');
});

test('pas de titre ou pas d\'heure de lecture : indisponible', () => {
  assert.equal(freshTitle(null, null, NOW), null);
  assert.equal(freshTitle('Fela Kuti - Zombie', null, NOW), null);
  assert.equal(freshTitle(null, ago(1000), NOW), null);
});

test('une heure de lecture dans le futur n\'est pas crue', () => {
  assert.equal(freshTitle('Fela Kuti - Zombie', new Date(NOW.getTime() + 60_000), NOW), null);
});

test('l\'heure de lecture peut arriver en texte ISO', () => {
  assert.equal(freshTitle('Fela Kuti - Zombie', ago(1000).toISOString(), NOW), 'Fela Kuti - Zombie');
});
