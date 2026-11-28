// Rôle : vérifie le réglage du chiffrement de la connexion à la base
// (buildSslConfig dans pool.js), sans se connecter à aucune base.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSslConfig } from './pool.js';

test('une base locale se connecte sans chiffrement', () => {
  assert.equal(buildSslConfig('postgres://dev@localhost:5432/elsewhere'), false);
  assert.equal(buildSslConfig('postgres://dev@127.0.0.1:5432/elsewhere'), false);
});

test('une base distante sans certificat est refusée', () => {
  assert.throws(
    () => buildSslConfig('postgres://u@aws-0-eu-west-3.pooler.supabase.com:5432/postgres'),
    /DATABASE_CA_CERT manquant/,
  );
});

test('une base distante est vérifiée avec le certificat fourni', () => {
  // N'importe quel fichier lisible fait l'affaire : on vérifie seulement
  // que son contenu est bien transmis à pg.
  const ssl = buildSslConfig(
    'postgres://u@aws-0-eu-west-3.pooler.supabase.com:5432/postgres',
    new URL(import.meta.url).pathname,
  );

  assert.match(ssl.ca, /buildSslConfig/);
});
