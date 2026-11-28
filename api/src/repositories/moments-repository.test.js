// Rôle : vérifie l'accès aux données des moments (moments-repository.js) et
// la lecture d'un thème (themes-repository.js) sur une vraie base
// PostgreSQL, dans un schéma jetable : copies enregistrées, heure locale
// calculée par la base, tri du plus récent au plus ancien, et filtre
// systématique par membre (un membre B ne voit ni ne supprime les moments
// d'un membre A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMoment,
  deleteMomentOfUser,
  listMomentsOfUser,
} from './moments-repository.js';
import { findThemeById } from './themes-repository.js';
import { createUser } from './users-repository.js';
import { upsertPlace } from './places-repository.js';
import { upsertStations } from './stations-repository.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

// Prépare une base jetable : deux membres (Julien et Aminata), le lieu
// Lagos, la station Cool FM et un thème. Le slug du thème est propre au
// test, pour ne jamais heurter une liste de thèmes remplie par migration.
// Renvoie { db, julien, aminata, station, theme, moment } : moment est un
// moment complet prêt à passer à createMoment (il manque userId).
async function setup(t) {
  const db = await startTestDatabase(t);
  const julien = await createUser(db, {
    email: 'julien@example.com', passwordHash: 'faux-hash', consentAt: new Date(),
  });
  const aminata = await createUser(db, {
    email: 'aminata@example.com', passwordHash: 'faux-hash', consentAt: new Date(),
  });
  const place = await upsertPlace(db, {
    name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria', timezone: 'Africa/Lagos',
  });
  await upsertStations(db, place.id, [{
    externalId: '9617a958-0601-11e8-ae97-52543be04c81',
    name: 'Cool FM',
    streamUrl: 'https://stream.example/cool',
    homepageUrl: null,
  }]);
  const { rows: [station] } = await db.query('SELECT id FROM stations');
  const { rows: [theme] } = await db.query(
    "INSERT INTO themes (slug, name) VALUES ('theme-de-test-moments', 'Highlife de test') RETURNING id",
  );

  const moment = {
    stationId: station.id,
    themeId: theme.id,
    stationName: 'Cool FM',
    placeName: 'Lagos',
    countryCode: 'NG',
    countryName: 'Nigeria',
    themeName: 'Highlife de test',
    trackTitle: 'Fela Kuti - Zombie',
    // 20 h 30 UTC = 21 h 30 à Lagos (UTC+1, sans heure d'été).
    keptAt: new Date('2026-11-28T20:30:00Z'),
    timezone: 'Africa/Lagos',
  };
  return { db, julien, aminata, station, theme, moment };
}

test('createMoment enregistre les copies et calcule l\'heure locale avec le fuseau du lieu', requiresDatabase, async (t) => {
  const { db, julien, station, theme, moment } = await setup(t);

  const created = await createMoment(db, { ...moment, userId: julien.id });

  assert.equal(typeof created.id, 'number');
  assert.deepEqual(created, {
    id: created.id,
    stationId: station.id,
    themeId: theme.id,
    stationName: 'Cool FM',
    placeName: 'Lagos',
    countryCode: 'NG',
    countryName: 'Nigeria',
    themeName: 'Highlife de test',
    trackTitle: 'Fela Kuti - Zombie',
    keptAt: new Date('2026-11-28T20:30:00Z'),
    localTime: '2026-11-28T21:30:00',
  });
  // Le propriétaire est bien enregistré, mais ne sort pas du repository.
  const { rows } = await db.query('SELECT user_id FROM moments');
  assert.equal(rows[0].user_id, julien.id);
});

test('createMoment accepte un moment sans thème ni titre', requiresDatabase, async (t) => {
  const { db, julien, moment } = await setup(t);

  const created = await createMoment(db, {
    ...moment, userId: julien.id, themeId: null, themeName: null, trackTitle: null,
  });

  assert.equal(created.themeId, null);
  assert.equal(created.themeName, null);
  assert.equal(created.trackTitle, null);
});

test('l\'heure locale suit l\'heure d\'été du lieu', requiresDatabase, async (t) => {
  const { db, julien, moment } = await setup(t);

  // Lisbonne en juillet : UTC+1 (heure d'été) ; en novembre : UTC+0.
  const summer = await createMoment(db, {
    ...moment, userId: julien.id, timezone: 'Europe/Lisbon', keptAt: new Date('2026-07-14T20:30:00Z'),
  });
  const winter = await createMoment(db, {
    ...moment, userId: julien.id, timezone: 'Europe/Lisbon', keptAt: new Date('2026-11-28T20:30:00Z'),
  });

  assert.equal(summer.localTime, '2026-07-14T21:30:00');
  assert.equal(winter.localTime, '2026-11-28T20:30:00');
});

test('listMomentsOfUser renvoie les moments du membre, du plus récent au plus ancien', requiresDatabase, async (t) => {
  const { db, julien, moment } = await setup(t);
  const older = await createMoment(db, { ...moment, userId: julien.id, keptAt: new Date('2026-11-20T10:00:00Z') });
  const newer = await createMoment(db, { ...moment, userId: julien.id, keptAt: new Date('2026-11-28T10:00:00Z') });
  const middle = await createMoment(db, { ...moment, userId: julien.id, keptAt: new Date('2026-11-25T10:00:00Z') });

  const moments = await listMomentsOfUser(db, julien.id);

  assert.deepEqual(moments.map((m) => m.id), [newer.id, middle.id, older.id]);
});

test('listMomentsOfUser ne renvoie jamais les moments d\'un autre membre', requiresDatabase, async (t) => {
  const { db, julien, aminata, moment } = await setup(t);
  const ofJulien = await createMoment(db, { ...moment, userId: julien.id });
  await createMoment(db, { ...moment, userId: aminata.id });

  const moments = await listMomentsOfUser(db, julien.id);

  assert.deepEqual(moments.map((m) => m.id), [ofJulien.id]);
  assert.deepEqual(await listMomentsOfUser(db, 999_999), []);
});

test('deleteMomentOfUser supprime le moment de son propriétaire et renvoie true', requiresDatabase, async (t) => {
  const { db, julien, moment } = await setup(t);
  const created = await createMoment(db, { ...moment, userId: julien.id });

  assert.equal(await deleteMomentOfUser(db, { userId: julien.id, momentId: created.id }), true);

  assert.deepEqual(await listMomentsOfUser(db, julien.id), []);
});

test('deleteMomentOfUser ne supprime pas le moment d\'un autre membre et renvoie false', requiresDatabase, async (t) => {
  const { db, julien, aminata, moment } = await setup(t);
  const ofJulien = await createMoment(db, { ...moment, userId: julien.id });

  assert.equal(await deleteMomentOfUser(db, { userId: aminata.id, momentId: ofJulien.id }), false);
  assert.equal(await deleteMomentOfUser(db, { userId: julien.id, momentId: 999_999 }), false);

  const { rows } = await db.query('SELECT count(*) AS total FROM moments');
  assert.equal(rows[0].total, '1');
});

test('un titre qui ressemble à du SQL est gardé tel quel (injection SQL)', requiresDatabase, async (t) => {
  const { db, julien, moment } = await setup(t);
  const tricky = "Zombie'); DELETE FROM moments; --";

  const created = await createMoment(db, { ...moment, userId: julien.id, trackTitle: tricky });

  assert.equal(created.trackTitle, tricky);
  assert.equal((await listMomentsOfUser(db, julien.id)).length, 1);
});

test('findThemeById renvoie le thème, ou null s\'il n\'existe pas', requiresDatabase, async (t) => {
  const { db, theme } = await setup(t);

  assert.deepEqual(await findThemeById(db, theme.id), { id: theme.id, name: 'Highlife de test' });
  assert.equal(await findThemeById(db, 999_999), null);
});
