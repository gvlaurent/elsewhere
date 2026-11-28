// Rôle : vérifie le texte du rapport affiché par npm run stations:import,
// à partir d'un rapport simulé (sans base ni réseau).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatImportReport } from './import-stations.js';

const report = {
  places: [
    {
      name: 'Lagos', countryCode: 'NG', kept: 12, inserted: 10, updated: 1, unchanged: 1,
      discarded: { offline: 3, notHttps: 20, duplicate: 2 },
    },
    {
      name: 'Accra', countryCode: 'GH', kept: 0, inserted: 0, updated: 0, unchanged: 0,
      discarded: { offline: 0, notHttps: 0, duplicate: 0 },
    },
  ],
  countries: [
    { countryCode: 'NG', received: 140, unknownPlace: 100, invalid: 3 },
    { countryCode: 'GH', received: 0, unknownPlace: 0, invalid: 0 },
  ],
};

test('le rapport donne, lieu par lieu, les stations gardées et écartées raison par raison', () => {
  const text = formatImportReport(report);

  assert.match(text, /Lagos \(NG\) : 12 gardées \(10 nouvelles, 1 mises à jour, 1 inchangées\), 25 écartées/);
  assert.match(text, /hors ligne : 3/);
  assert.match(text, /pas en HTTPS : 20/);
  assert.match(text, /doublon : 2/);
  assert.match(text, /Accra \(GH\) : 0 gardées/);
});

test('le rapport donne, pays par pays, les stations sans lieu connu ou invalides', () => {
  const text = formatImportReport(report);

  assert.match(text, /NG : 140 reçues de Radio Browser, 100 lieu inconnu, 3 invalides/);
});

test('le rapport se termine par les totaux', () => {
  const text = formatImportReport(report);

  // 12 gardées ; écartées : 25 (Lagos) + 100 lieu inconnu + 3 invalides.
  assert.match(text, /Total : 12 stations gardées, 128 écartées/);
});
