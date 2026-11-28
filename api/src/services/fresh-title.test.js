// Rôle : vérifie la règle « jamais de faux titre » à la lecture
// (fresh-title.js), sans base ni serveur : un titre n'est montré que s'il a
// été lu il y a moins de 5 minutes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TITLE_MAX_AGE_MS, freshTitle } from './fresh-title.js';

const NOW = new Date('2026-11-28T21:58:00Z');

// Renvoie l'instant situé « ms » millisecondes avant NOW.
function before(ms) {
  return new Date(NOW.getTime() - ms);
}

test('un titre lu il y a 2 minutes est montré', () => {
  assert.equal(freshTitle('Youssou N\'Dour – Birima', before(2 * 60 * 1000), NOW), 'Youssou N\'Dour – Birima');
});

test('un titre lu il y a plus de 5 minutes devient « titre indisponible » (null)', () => {
  assert.equal(freshTitle('Baaba Maal – Yela', before(6 * 60 * 1000), NOW), null);
});

test('la limite est stricte : un titre lu il y a exactement 5 minutes n\'est plus montré', () => {
  assert.equal(TITLE_MAX_AGE_MS, 5 * 60 * 1000);
  assert.equal(freshTitle('Titre', before(TITLE_MAX_AGE_MS), NOW), null);
  assert.equal(freshTitle('Titre', before(TITLE_MAX_AGE_MS - 1), NOW), 'Titre');
});

test('sans titre ou sans heure de lecture : titre indisponible', () => {
  assert.equal(freshTitle(null, null, NOW), null);
  assert.equal(freshTitle('Titre', null, NOW), null);
  assert.equal(freshTitle(null, before(1000), NOW), null);
  assert.equal(freshTitle('', before(1000), NOW), null);
});

test('une heure de lecture dans le futur n\'est pas crue', () => {
  assert.equal(freshTitle('Titre', new Date(NOW.getTime() + 60 * 1000), NOW), null);
});

test('accepte une heure de lecture en texte ISO (telle qu\'un JSON la porterait)', () => {
  assert.equal(freshTitle('Titre', before(1000).toISOString(), NOW), 'Titre');
});
