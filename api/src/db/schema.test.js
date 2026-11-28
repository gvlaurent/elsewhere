// Rôle : vérifie le schéma créé par les migrations (src/db/migrations/) :
// les 10 tables existent, une migration n'est jamais appliquée deux fois, et
// la base refuse elle-même les données qui violent les règles du modèle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from './migrate.js';
import { PG_ERROR } from './postgres-error-codes.js';
import { startTestDatabase, requiresDatabase, withoutLogs } from './start-database-for-tests.js';

// Insère un lieu (Lagos), une station (Cool FM) et un membre (Julien),
// socle commun de plusieurs tests. Reçoit le pool ; renvoie leurs
// identifiants { placeId, stationId, userId }.
async function insertPlaceStationAndMember(db) {
  const place = await db.query(
    `INSERT INTO places (name, country_code, country_name, timezone)
     VALUES ('Lagos', 'NG', 'Nigeria', 'Africa/Lagos') RETURNING id`,
  );
  const placeId = place.rows[0].id;
  const station = await db.query(
    `INSERT INTO stations (external_id, place_id, name, stream_url)
     VALUES (gen_random_uuid(), $1, 'Cool FM', 'https://stream.example/cool') RETURNING id`,
    [placeId],
  );
  const user = await db.query(
    `INSERT INTO users (email, password_hash, consent_at)
     VALUES ('julien@example.com', 'hash', now()) RETURNING id`,
  );
  return { placeId, stationId: station.rows[0].id, userId: user.rows[0].id };
}

// Garde un moment à Lagos sur Cool FM. Reçoit le pool et les colonnes
// propres au test ({ userId, stationId, trackTitle, themeId, themeName }) ;
// les copies du lieu et de la station sont fixes. Renvoie la promesse de
// la requête, pour pouvoir vérifier qu'elle est refusée.
function insertMoment(db, { userId, stationId, trackTitle = null, themeId = null, themeName = null }) {
  return db.query(
    `INSERT INTO moments (user_id, station_id, theme_id, station_name, place_name,
       country_code, country_name, theme_name, track_title, local_time)
     VALUES ($1, $2, $3, 'Cool FM', 'Lagos', 'NG', 'Nigeria', $4, $5, '2026-11-24 21:30')`,
    [userId, stationId, themeId, themeName, trackTitle],
  );
}

test('les migrations créent les 10 tables du modèle', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name <> 'schema_migrations'
     ORDER BY table_name`,
  );

  assert.deepEqual(
    rows.map((row) => row.table_name),
    ['list_stations', 'lists', 'moments', 'places', 'reports',
      'sessions', 'station_themes', 'stations', 'themes', 'users'],
  );
});

test('relancer les migrations ne rejoue rien', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const applied = await runMigrations(db, withoutLogs);

  assert.deepEqual(applied, []);
});

test('un e-mail ne sert qu\'une fois, majuscules comprises', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  await insertPlaceStationAndMember(db);

  await assert.rejects(
    db.query(
      `INSERT INTO users (email, password_hash, consent_at)
       VALUES ('Julien@Example.com', 'hash', now())`,
    ),
    { code: PG_ERROR.UNIQUE_VIOLATION },
  );
});

test('le rôle d\'un compte est « member » ou « admin », rien d\'autre', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  await assert.rejects(
    db.query(
      `INSERT INTO users (email, password_hash, consent_at, role)
       VALUES ('a@example.com', 'hash', now(), 'superadmin')`,
    ),
    { code: PG_ERROR.CHECK_VIOLATION },
  );
});

test('un titre lu sans son heure de lecture est refusé', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId } = await insertPlaceStationAndMember(db);

  await assert.rejects(
    db.query(`UPDATE stations SET last_title = 'Fela Kuti - Zombie' WHERE id = $1`, [stationId]),
    { code: PG_ERROR.CHECK_VIOLATION },
  );
});

test('modifier une station met à jour sa date de mise à jour', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId } = await insertPlaceStationAndMember(db);
  // On recule la date à la main : sans le déclencheur, elle resterait au 1er janvier.
  await db.query(`UPDATE stations SET updated_at = '2026-01-01' WHERE id = $1`, [stationId]);

  await db.query(`UPDATE stations SET name = 'Cool FM Lagos' WHERE id = $1`, [stationId]);

  const { rows } = await db.query(
    `SELECT updated_at > '2026-01-02' AS refreshed FROM stations WHERE id = $1`,
    [stationId],
  );
  assert.equal(rows[0].refreshed, true);
});

test('un membre ne signale une station qu\'une fois', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertPlaceStationAndMember(db);
  const report = `INSERT INTO reports (user_id, station_id, reason) VALUES ($1, $2, 'no_sound')`;

  await db.query(report, [userId, stationId]);

  await assert.rejects(db.query(report, [userId, stationId]), { code: PG_ERROR.UNIQUE_VIOLATION });
});

test('deux listes d\'un même membre ne portent pas le même nom', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { userId } = await insertPlaceStationAndMember(db);
  await db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'Réveil')`, [userId]);

  await assert.rejects(
    db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'réveil')`, [userId]),
    { code: PG_ERROR.UNIQUE_VIOLATION },
  );
});

test('des espaces autour du nom ne font pas une nouvelle liste', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { userId } = await insertPlaceStationAndMember(db);
  await db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'Réveil')`, [userId]);

  await assert.rejects(
    db.query(`INSERT INTO lists (user_id, name) VALUES ($1, ' Réveil ')`, [userId]),
    { code: PG_ERROR.UNIQUE_VIOLATION },
  );
});

test('un lieu qui porte encore des stations ne peut pas être supprimé', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { placeId } = await insertPlaceStationAndMember(db);

  await assert.rejects(
    db.query('DELETE FROM places WHERE id = $1', [placeId]),
    { code: PG_ERROR.FOREIGN_KEY_VIOLATION },
  );
});

test('un moment relié à un thème en garde aussi le nom', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertPlaceStationAndMember(db);
  const theme = await db.query(
    `INSERT INTO themes (slug, name) VALUES ('highlife', 'Highlife') RETURNING id`,
  );

  await assert.rejects(
    insertMoment(db, { userId, stationId, themeId: theme.rows[0].id, themeName: null }),
    { code: PG_ERROR.CHECK_VIOLATION },
  );
});

test('supprimer un compte efface ses moments, listes et signalements', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertPlaceStationAndMember(db);
  await insertMoment(db, { userId, stationId });
  const list = await db.query(
    `INSERT INTO lists (user_id, name) VALUES ($1, 'Réveil') RETURNING id`, [userId],
  );
  await db.query(
    'INSERT INTO list_stations (list_id, station_id) VALUES ($1, $2)',
    [list.rows[0].id, stationId],
  );
  await db.query(
    `INSERT INTO reports (user_id, station_id, reason) VALUES ($1, $2, 'no_sound')`,
    [userId, stationId],
  );

  await db.query('DELETE FROM users WHERE id = $1', [userId]);

  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM moments) AS moments,
            (SELECT count(*) FROM lists) AS lists,
            (SELECT count(*) FROM list_stations) AS list_stations,
            (SELECT count(*) FROM reports) AS reports`,
  );
  assert.deepEqual(rows[0], { moments: '0', lists: '0', list_stations: '0', reports: '0' });
});

test('un moment survit à la disparition de sa station, grâce à ses copies', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertPlaceStationAndMember(db);
  await insertMoment(db, { userId, stationId, trackTitle: 'Fela Kuti - Zombie' });

  await db.query('DELETE FROM stations WHERE id = $1', [stationId]);

  const { rows } = await db.query('SELECT station_id, station_name, track_title FROM moments');
  assert.deepEqual(rows, [
    { station_id: null, station_name: 'Cool FM', track_title: 'Fela Kuti - Zombie' },
  ]);
});
