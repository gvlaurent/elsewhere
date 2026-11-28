// Rôle : outil partagé par les tests qui touchent la base. N'est jamais
// chargé par l'application. Chaque fichier de test obtient son propre
// schéma PostgreSQL jetable (un espace de noms séparé, comme un dossier) :
// les migrations y créent les 9 tables, le test y écrit ce qu'il veut, puis
// le schéma est effacé. Les vraies tables de Supabase ne sont jamais touchées.
// Son nom évite le motif « test-*.js » que node --test exécuterait.
import { randomBytes } from 'node:crypto';
import { createPool } from './pool.js';
import { runMigrations } from './migrate.js';

// Options à passer à chaque test qui touche la base :
// test('…', requiresDatabase, async (t) => { … }).
// Sans DATABASE_URL (par exemple dans l'intégration continue sans secret),
// node --test saute ces tests et affiche la raison, au lieu d'échouer.
export const requiresDatabase = {
  skip: process.env.DATABASE_URL
    ? false
    : 'DATABASE_URL absente : tests de base sautés (voir api/.env.example)',
};

// Option de runMigrations qui coupe ses messages, pour garder la sortie
// des tests lisible.
export const withoutLogs = { log: () => {} };

// Crée un schéma jetable, y applique toutes les migrations et programme son
// effacement à la fin du test. Reçoit le contexte du test (t). Renvoie un
// pool de connexions dont chaque requête vise ce schéma.
export async function startTestDatabase(t) {
  // Nom tiré au hasard (lettres et chiffres seulement) : deux lancements en
  // parallèle ne se marchent pas dessus. Il est collé dans le SQL plus bas,
  // ce qui est sans danger parce qu'on le fabrique nous-mêmes.
  const schema = `test_${randomBytes(6).toString('hex')}`;

  const pool = createPool();
  // À chaque nouvelle connexion du pool, on règle le chemin de recherche :
  // une table écrite sans préfixe (« users ») sera cherchée et créée dans
  // le schéma jetable. 'public' reste derrière pour les fonctions communes.
  // Asynchrone sans await : pg met les requêtes d'une connexion en file, donc
  // ce SET passe forcément avant la première requête du test.
  pool.on('connect', (client) => {
    client.query(`SET search_path TO ${schema}, public`);
  });

  await pool.query(`CREATE SCHEMA ${schema}`);

  // Enregistré avant les migrations : même si elles échouent, le schéma est
  // effacé et le pool fermé, pour ne laisser aucun déchet dans Supabase.
  t.after(async () => {
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  });

  await runMigrations(pool, withoutLogs);
  return pool;
}
