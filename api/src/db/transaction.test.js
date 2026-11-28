// Rôle : vérifie l'outil de transaction (transaction.js) : tout est gardé si
// le travail réussit, rien n'est gardé s'il échoue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withTransaction } from './transaction.js';
import { startTestDatabase, requiresDatabase } from './start-database-for-tests.js';

const insertPlace = (client, name) =>
  client.query(
    `INSERT INTO places (name, country_code, country_name, timezone)
     VALUES ($1, 'NG', 'Nigeria', 'Africa/Lagos')`,
    [name],
  );

test('withTransaction valide le travail et renvoie son résultat', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  const result = await withTransaction(db, async (client) => {
    await insertPlace(client, 'Lagos');
    return 'fini';
  });

  assert.equal(result, 'fini');
  const { rows } = await db.query('SELECT count(*) AS total FROM places');
  assert.equal(rows[0].total, '1');
});

test('withTransaction annule tout si le travail échoue en cours de route', requiresDatabase, async (t) => {
  const db = await startTestDatabase(t);

  await assert.rejects(
    withTransaction(db, async (client) => {
      await insertPlace(client, 'Lagos');
      throw new Error('panne au milieu');
    }),
    /panne au milieu/,
  );

  const { rows } = await db.query('SELECT count(*) AS total FROM places');
  assert.equal(rows[0].total, '0');
});

// Faux pool dont la connexion échoue au choix sur certaines requêtes. Il
// note ce que reçoit release, pour vérifier que la connexion est détruite.
function fakePool({ failOn }) {
  const released = [];
  const client = {
    query: async (sql) => {
      if (failOn.includes(sql)) throw new Error(`${sql} impossible : connexion coupée`);
    },
    release: (error) => released.push(error),
  };
  return { pool: { connect: async () => client }, released };
}

test('ROLLBACK en échec : l\'erreur d\'origine remonte et la connexion est détruite', async () => {
  const { pool, released } = fakePool({ failOn: ['ROLLBACK'] });

  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('erreur d\'origine');
    }),
    /erreur d'origine/,
  );

  // release(error) : pg détruit la connexion au lieu de la remettre au pool.
  assert.equal(released.length, 1);
  assert.match(released[0].message, /erreur d'origine/);
});

test('travail réussi : la connexion est rendue au pool sans erreur', async () => {
  const { pool, released } = fakePool({ failOn: [] });

  await withTransaction(pool, async () => 'ok');

  assert.deepEqual(released, [undefined]);
});
