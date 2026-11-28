// Rôle : couche d'accès aux données des comptes (table users). C'est la
// seule couche qui écrit du SQL ; elle ne décide d'aucune règle métier
// (qui a le droit de s'inscrire, comment on vérifie un mot de passe : c'est
// le travail du service, ELS-17).
//
// Toutes les requêtes sont paramétrées : le texte SQL contient des repères
// $1, $2…, et les valeurs voyagent à part. PostgreSQL ne les lit jamais
// comme du SQL, ce qui rend l'injection SQL impossible.
//
// Chaque fonction reçoit en premier « db », le pool de connexions : le
// service passe le pool de l'application, un test passe celui de sa base
// jetable.

// Colonnes renvoyées au reste de l'API, renommées en camelCase (la base est
// en snake_case, le JavaScript en camelCase). Le hash du mot de passe n'y
// est pas : il ne sort de la base que pour la connexion (findUserByEmail).
const PUBLIC_COLUMNS = `
  id, email, role, consent_at AS "consentAt", created_at AS "createdAt"`;

// Enregistre un nouveau compte. Reçoit le pool et { email, passwordHash,
// consentAt } (le hash est calculé avant, par le service). Renvoie le compte
// créé, sans son hash. Lève l'erreur PostgreSQL 23505 si l'e-mail existe déjà.
export async function createUser(db, { email, passwordHash, consentAt }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, consent_at)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email, passwordHash, consentAt],
  );
  return rows[0];
}

// Cherche un compte par son e-mail, sans tenir compte des majuscules, pour
// la connexion. Reçoit le pool et l'e-mail. Renvoie le compte avec son hash
// (passwordHash), ou null s'il n'existe pas.
export async function findUserByEmail(db, email) {
  const { rows } = await db.query(
    // lower(email) des deux côtés : la recherche utilise l'index unique
    // users_email_unique, construit sur lower(email).
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash"
     FROM users
     WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}
