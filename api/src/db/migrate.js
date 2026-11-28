// Rôle : applique les migrations de la base, c'est-à-dire les fichiers SQL
// de src/db/migrations/, chacun une seule fois et dans l'ordre de leur numéro
// (001_, 002_…). C'est l'historique versionné de la structure de la base :
// on n'en modifie jamais un fichier déjà appliqué, on en ajoute un nouveau.
//
// Lancement : npm run db:migrate (depuis api/), avec DATABASE_URL dans .env.
// Les tests l'appellent aussi, pour créer les tables dans un schéma jetable.
import { readdir, readFile } from 'node:fs/promises';
import { createPool } from './pool.js';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);

// Applique les migrations pas encore passées sur cette base.
// Reçoit un pool pg et, en option, une fonction log (console.log par défaut).
// Renvoie la liste des noms de fichiers appliqués ([] si tout était à jour).
// Lève l'erreur SQL si une migration échoue : elle est alors annulée en
// entier, et les suivantes ne sont pas lancées.
export async function runMigrations(pool, { log = console.log } = {}) {
  // Table de suivi : une ligne par migration déjà appliquée.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  // Comme les 9 tables (voir la fin de 001), fermée à l'API automatique de
  // Supabase. Sans effet si c'est déjà fait : on peut le relancer.
  await pool.query('ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY');

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort(); // le préfixe 001_, 002_… donne l'ordre
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const alreadyApplied = new Set(rows.map((row) => row.name));

  const applied = [];
  for (const file of files) {
    if (alreadyApplied.has(file)) continue;

    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    // Une seule connexion pour toute la transaction : BEGIN, le SQL et COMMIT
    // doivent passer par la même, sinon la transaction ne tient pas.
    const client = await pool.connect();
    try {
      // Transaction : soit toute la migration passe et elle est notée comme
      // appliquée, soit rien ne change. Jamais de base à moitié migrée.
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`Migration appliquée : ${file}`);
      applied.push(file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release(); // rend la connexion au pool, même en cas d'erreur
    }
  }

  if (applied.length === 0) log('Base déjà à jour.');
  return applied;
}

// Lancé directement (npm run db:migrate) plutôt qu'importé par un test :
// on applique les migrations sur la base de DATABASE_URL, puis on ferme.
if (import.meta.main) {
  const pool = createPool();
  try {
    await runMigrations(pool);
  } catch (error) {
    console.error('Migration échouée :', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
