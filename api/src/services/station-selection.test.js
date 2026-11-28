// Rôle : vérifie les règles métier du tri des stations (station-selection.js)
// sur des données simulées de Radio Browser, sans base ni réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStations, matchesPlace, normalizeText } from './station-selection.js';

const lagos = {
  name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos',
  stateAliases: ['Lagos'],
};
const accra = {
  name: 'Accra', countryCode: 'GH', countryName: 'Ghana', timezone: 'Africa/Accra',
  stateAliases: ['Accra'],
};

let counter = 0;
// Fabrique une station simulée, telle que la renvoie le client Radio Browser.
function rbStation(overrides = {}) {
  counter += 1;
  const n = String(counter).padStart(12, '0');
  return {
    stationuuid: `00000000-0000-4000-8000-${n}`,
    name: `Station ${counter}`,
    url: `https://stream.example/${counter}`,
    url_resolved: `https://stream.example/${counter}`,
    homepage: 'https://radio.example',
    countrycode: 'NG',
    state: 'Lagos',
    lastcheckok: 1,
    votes: 0,
    ...overrides,
  };
}

test('normalizeText ignore majuscules, accents et espaces autour', () => {
  assert.equal(normalizeText('  Bogotá D.C. '), 'bogota d.c.');
  assert.equal(normalizeText('İstanbul'), 'istanbul');
});

test('matchesPlace : le champ state contient un alias, sans tenir compte des accents', () => {
  const bogota = { ...lagos, countryCode: 'CO', stateAliases: ['Bogota'] };
  assert.equal(matchesPlace({ countrycode: 'CO', state: 'Bogotá D.C.' }, bogota), true);
  assert.equal(matchesPlace({ countrycode: 'NG', state: 'Lagos State' }, lagos), true);
  assert.equal(matchesPlace({ countrycode: 'NG', state: 'Kano' }, lagos), false);
  assert.equal(matchesPlace({ countrycode: 'NG', state: '', name: 'Beat FM' }, lagos), false);
  // Même texte, autre pays : pas ce lieu.
  assert.equal(matchesPlace({ countrycode: 'GH', state: 'Lagos' }, lagos), false);
});

test('ne garde que les flux en https://', () => {
  const secure = rbStation();
  const plain = rbStation({ url: 'http://stream.example/x', url_resolved: 'http://stream.example/x' });
  const broken = rbStation({ url: 'pas une adresse', url_resolved: '' });

  const { places } = selectStations({ NG: [secure, plain, broken] }, [lagos]);

  assert.deepEqual(places[0].kept.map((s) => s.externalId), [secure.stationuuid]);
  assert.equal(places[0].discarded.not_https, 2);
});

test('url_resolved vide : on se rabat sur url, toujours en HTTPS seulement', () => {
  const station = rbStation({ url_resolved: '', url: 'https://direct.example/live' });

  const { places } = selectStations({ NG: [station] }, [lagos]);

  assert.equal(places[0].kept[0].streamUrl, 'https://direct.example/live');
});

test('écarte les stations hors ligne (dernier test raté)', () => {
  const online = rbStation();
  const offline = rbStation({ lastcheckok: 0 });

  const { places } = selectStations({ NG: [online, offline] }, [lagos]);

  assert.equal(places[0].kept.length, 1);
  assert.equal(places[0].discarded.offline, 1);
});

test('écarte les doublons et garde la station la plus votée', () => {
  const lessVoted = rbStation({ name: 'Cool FM', votes: 3 });
  const moreVoted = rbStation({ name: 'Cool FM', votes: 40 });
  const sameStream = rbStation({ name: 'Autre nom', url_resolved: moreVoted.url_resolved + '/' });
  const sameUuid = { ...moreVoted, name: 'Copie exacte' };

  const { places } = selectStations({ NG: [lessVoted, moreVoted, sameStream, sameUuid] }, [lagos]);

  assert.deepEqual(places[0].kept.map((s) => s.externalId), [moreVoted.stationuuid]);
  assert.equal(places[0].discarded.duplicate, 3);
});

test('rattache chaque station à son lieu ; sans correspondance : « lieu inconnu », compté par pays', () => {
  const inLagos = rbStation({ state: 'Lagos State' });
  const inKano = rbStation({ state: 'Kano' });
  const noState = rbStation({ state: '' });
  const inAccra = rbStation({ countrycode: 'GH', state: 'Greater Accra' });

  const result = selectStations({ NG: [inLagos, inKano, noState], GH: [inAccra] }, [lagos, accra]);

  assert.deepEqual(result.places[0].kept.map((s) => s.externalId), [inLagos.stationuuid]);
  assert.deepEqual(result.places[1].kept.map((s) => s.externalId), [inAccra.stationuuid]);
  assert.deepEqual(result.countries, [
    { countryCode: 'NG', received: 3, unknownPlace: 2, invalid: 0 },
    { countryCode: 'GH', received: 1, unknownPlace: 0, invalid: 0 },
  ]);
});

test('écarte une station sans identifiant valide ou sans nom', () => {
  const noUuid = rbStation({ stationuuid: 'pas-un-uuid' });
  const noName = rbStation({ name: '   ' });

  const { places, countries } = selectStations({ NG: [noUuid, noName] }, [lagos]);

  assert.equal(places[0].kept.length, 0);
  assert.equal(countries[0].invalid, 2);
});

test('renvoie la station au format de la base, nom nettoyé, site gardé seulement s\'il est une adresse web', () => {
  const station = rbStation({ name: '  Rhythm 93.7  ', homepage: 'javascript:alert(1)' });

  const { places } = selectStations({ NG: [station] }, [lagos]);

  assert.deepEqual(places[0].kept[0], {
    externalId: station.stationuuid,
    name: 'Rhythm 93.7',
    streamUrl: station.url_resolved,
    homepageUrl: null,
  });
});

// Règle de rattachement décidée par Gabriel le 28/11/2026 : la région
// (« state ») d'abord, sinon le nom de la station.
const dakar = {
  name: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', timezone: 'Africa/Dakar',
  stateAliases: ['Dakar'],
};

test('state vide : une station du Sénégal dont le nom contient « Dakar » est rattachée à Dakar', () => {
  const station = rbStation({ countrycode: 'SN', state: '', name: 'Radio Dakar FM' });
  const accents = rbStation({ countrycode: 'SN', state: '', name: 'DAKÂR musique' });

  const { places, countries } = selectStations({ SN: [station, accents] }, [dakar]);

  assert.deepEqual(places[0].kept.map((s) => s.externalId), [station.stationuuid, accents.stationuuid]);
  assert.equal(countries[0].unknownPlace, 0);
});

test('state vide et nom sans aucun alias : la station est écartée, « lieu inconnu »', () => {
  const station = rbStation({ countrycode: 'SN', state: '', name: 'Zik FM' });

  const { places, countries } = selectStations({ SN: [station] }, [dakar]);

  assert.equal(places[0].kept.length, 0);
  assert.equal(countries[0].unknownPlace, 1);
});

test('state rempli qui ne correspond pas : écartée, même si le nom contient l\'alias', () => {
  const station = rbStation({ countrycode: 'SN', state: 'Saint-Louis', name: 'Dakar Musique' });

  const { places, countries } = selectStations({ SN: [station] }, [dakar]);

  assert.equal(places[0].kept.length, 0);
  assert.equal(countries[0].unknownPlace, 1);
});

test('le nom ne sert jamais hors du pays du lieu', () => {
  const station = rbStation({ countrycode: 'FR', state: '', name: 'Dakar Paris' });

  assert.equal(matchesPlace(station, dakar), false);
});
