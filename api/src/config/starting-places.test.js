// Rôle : vérifie que la liste des lieux de départ respecte les règles de la
// table places (code pays, fuseau IANA) avant même de toucher la base.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STARTING_PLACES } from './starting-places.js';

test('les 6 lieux de départ validés le 28/11/2026', () => {
  assert.deepEqual(
    STARTING_PLACES.map((place) => place.name),
    ['Dakar', 'Lagos', 'Accra', 'Bogotá', 'Istanbul', 'Lisbonne'],
  );
});

test('chaque lieu a un code pays ISO, un nom de pays, des alias et un fuseau IANA valide', () => {
  for (const place of STARTING_PLACES) {
    assert.match(place.countryCode, /^[A-Z]{2}$/, place.name);
    assert.ok(place.countryName.trim(), place.name);
    assert.ok(place.stateAliases.length > 0, place.name);
    // Intl refuse un fuseau inconnu (RangeError) : c'est la preuve que le
    // nom IANA existe vraiment.
    assert.doesNotThrow(() => new Intl.DateTimeFormat('fr', { timeZone: place.timezone }), place.name);
  }
});

test('deux lieux n\'ont jamais le même nom dans un même pays (règle UNIQUE de places)', () => {
  const keys = STARTING_PLACES.map((place) => `${place.countryCode}/${place.name}`);
  assert.equal(new Set(keys).size, keys.length);
});
