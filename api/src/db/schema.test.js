// Rôle : vérifie le schéma créé par les migrations (src/db/migrations/) :
// les 9 tables existent, une migration n'est jamais appliquée deux fois, et
// la base refuse elle-même les données qui violent les règles du modèle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from './migrate.js';
import { startTestDatabase, skipWithoutDatabase } from './start-database-for-tests.js';

const options = { skip: skipWithoutDatabase };

// Code d'erreur PostgreSQL, pour vérifier quelle règle a refusé la donnée.
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const RESTRICT_VIOLATION = '23001';

// Insère un lieu, une station et un membre, socle commun de plusieurs tests.
// Reçoit le pool ; renvoie les identifiants créés.
async function insertBasics(db) {
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

test('les migrations créent les 9 tables du modèle', options, async (t) => {
  const db = await startTestDatabase(t);

  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name <> 'schema_migrations'
     ORDER BY table_name`,
  );

  assert.deepEqual(
    rows.map((row) => row.table_name),
    ['list_stations', 'lists', 'moments', 'places', 'reports',
      'station_themes', 'stations', 'themes', 'users'],
  );
});

test('relancer les migrations ne rejoue rien', options, async (t) => {
  const db = await startTestDatabase(t);

  const applied = await runMigrations(db, { log: () => {} });

  assert.deepEqual(applied, []);
});

test('un e-mail ne sert qu\'une fois, majuscules comprises', options, async (t) => {
  const db = await startTestDatabase(t);
  await insertBasics(db);

  await assert.rejects(
    db.query(
      `INSERT INTO users (email, password_hash, consent_at)
       VALUES ('Julien@Example.com', 'hash', now())`,
    ),
    { code: UNIQUE_VIOLATION },
  );
});

test('le rôle d\'un compte est « member » ou « admin », rien d\'autre', options, async (t) => {
  const db = await startTestDatabase(t);

  await assert.rejects(
    db.query(
      `INSERT INTO users (email, password_hash, consent_at, role)
       VALUES ('a@example.com', 'hash', now(), 'superadmin')`,
    ),
    { code: CHECK_VIOLATION },
  );
});

test('un titre lu sans son heure de lecture est refusé', options, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId } = await insertBasics(db);

  await assert.rejects(
    db.query(`UPDATE stations SET last_title = 'Fela Kuti - Zombie' WHERE id = $1`, [stationId]),
    { code: CHECK_VIOLATION },
  );
});

test('un membre ne signale une station qu\'une fois', options, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertBasics(db);
  const report = `INSERT INTO reports (user_id, station_id, reason) VALUES ($1, $2, 'no_sound')`;

  await db.query(report, [userId, stationId]);

  await assert.rejects(db.query(report, [userId, stationId]), { code: UNIQUE_VIOLATION });
});

test('deux listes d\'un même membre ne portent pas le même nom', options, async (t) => {
  const db = await startTestDatabase(t);
  const { userId } = await insertBasics(db);
  await db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'Réveil')`, [userId]);

  await assert.rejects(
    db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'réveil')`, [userId]),
    { code: UNIQUE_VIOLATION },
  );
});

test('un lieu qui porte encore des stations ne peut pas être supprimé', options, async (t) => {
  const db = await startTestDatabase(t);
  const { placeId } = await insertBasics(db);

  await assert.rejects(
    db.query('DELETE FROM places WHERE id = $1', [placeId]),
    { code: RESTRICT_VIOLATION },
  );
});

test('supprimer un compte efface ses moments, listes et signalements', options, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertBasics(db);
  await db.query(
    `INSERT INTO moments (user_id, station_id, station_name, place_name,
       country_code, country_name, local_time)
     VALUES ($1, $2, 'Cool FM', 'Lagos', 'NG', 'Nigeria', '2026-11-24 21:30')`,
    [userId, stationId],
  );
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

test('un moment survit à la disparition de sa station, grâce à ses copies', options, async (t) => {
  const db = await startTestDatabase(t);
  const { stationId, userId } = await insertBasics(db);
  await db.query(
    `INSERT INTO moments (user_id, station_id, station_name, place_name,
       country_code, country_name, local_time, track_title)
     VALUES ($1, $2, 'Cool FM', 'Lagos', 'NG', 'Nigeria', '2026-11-24 21:30', 'Fela Kuti - Zombie')`,
    [userId, stationId],
  );

  await db.query('DELETE FROM stations WHERE id = $1', [stationId]);

  const { rows } = await db.query('SELECT station_id, station_name, track_title FROM moments');
  assert.deepEqual(rows, [
    { station_id: null, station_name: 'Cool FM', track_title: 'Fela Kuti - Zombie' },
  ]);
});
