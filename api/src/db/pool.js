// Rôle : ouvre la connexion entre l'API et PostgreSQL (hébergé chez Supabase).
// createPool() est appelée par le script de migration et par l'outil des
// tests (start-database-for-tests.js), puis le sera par le démarrage du
// serveur. Le pool créé n'est ensuite utilisé que par la couche d'accès aux
// données (src/repositories/) : les routes, contrôleurs et services ne
// parlent jamais directement à la base.
//
// Un « pool » est une réserve de connexions ouvertes à l'avance : chaque
// requête en emprunte une puis la rend, au lieu d'ouvrir une connexion
// (lente : réseau + chiffrement + mot de passe) à chaque fois.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Construit le réglage du chiffrement (TLS) de la connexion.
// Reçoit l'adresse de la base et le chemin du certificat de Supabase.
// Renvoie la configuration TLS de pg, ou false pour une base locale.
//
// Pourquoi un certificat : le mot de passe de la base voyage sur Internet.
// Le chiffrement le cache, et le certificat de l'autorité de Supabase permet
// de vérifier qu'on parle bien à Supabase et pas à un imposteur. Ce
// certificat est public (ce n'est pas un secret) ; Supabase le fournit dans
// Project Settings → Database → SSL Configuration.
export function buildSslConfig(databaseUrl, caCertPath) {
  const { hostname } = new URL(databaseUrl);
  if (LOCAL_HOSTS.has(hostname)) return false;

  // Sécurité : sans certificat, on refuse de démarrer plutôt que de se
  // connecter sans pouvoir vérifier le serveur.
  if (!caCertPath) {
    throw new Error(
      'DATABASE_CA_CERT manquant : impossible de vérifier le serveur de la base (voir api/.env.example)',
    );
  }
  return { ca: readFileSync(caCertPath, 'utf8') };
}

// Crée un pool de connexions à partir des variables d'environnement.
// Ne reçoit rien ; renvoie un pg.Pool prêt à servir (il ne se connecte
// vraiment qu'à la première requête). Lève une erreur si DATABASE_URL manque.
export function createPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquante (voir api/.env.example)');
  }

  // Contournement : si l'adresse contient « ?sslmode=… », pg laisse ce
  // réglage écraser l'option ssl ci-dessous, et notre certificat serait
  // ignoré. On le retire donc : le chiffrement se règle ici, pas dans l'URL.
  const connectionUrl = new URL(databaseUrl);
  connectionUrl.searchParams.delete('sslmode');

  const pool = new pg.Pool({
    connectionString: connectionUrl.toString(),
    ssl: buildSslConfig(databaseUrl, process.env.DATABASE_CA_CERT),
  });

  // Une connexion inactive peut être coupée par le réseau ou par Supabase.
  // Sans ce gestionnaire, cette erreur arrêterait tout le processus Node.
  // Le pool remplace la connexion perdue tout seul : on se contente de noter.
  pool.on('error', (error) => {
    console.error('Connexion à la base perdue :', error.message);
  });

  return pool;
}
