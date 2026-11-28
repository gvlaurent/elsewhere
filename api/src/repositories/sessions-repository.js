// Rôle : couche d'accès aux données des sessions de connexion (table
// sessions, migration 002). Seule couche qui écrit du SQL ; elle ne décide
// d'aucune règle : la durée d'une session et la fabrication du jeton sont
// le travail du service (auth-service.js).
//
// Elle ne voit jamais le jeton lui-même, seulement son empreinte SHA-256
// (tokenHash) : c'est tout ce que la base garde. Requêtes paramétrées,
// comme partout (voir users-repository.js).

// Enregistre une session. Reçoit le pool et { userId, tokenHash, expiresAt }.
// Ne renvoie rien : le service a déjà tout ce qu'il doit rendre.
export async function createSession(db, { userId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

// Retrouve le membre d'une session encore valide. Reçoit le pool et
// l'empreinte du jeton. Renvoie le compte, sans le hash de son mot de
// passe, ou null si la session n'existe pas ou a expiré.
export async function findUserBySessionTokenHash(db, tokenHash) {
  const { rows } = await db.query(
    // La date d'expiration est comparée par la base (now()) : une session
    // expirée est refusée même si son ménage n'a pas encore eu lieu.
    `SELECT u.id, u.email, u.role, u.consent_at AS "consentAt", u.created_at AS "createdAt"
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

// Supprime une session : c'est la déconnexion côté serveur. Reçoit le pool
// et l'empreinte du jeton. Ne renvoie rien, et ne fait rien si la session
// n'existe pas.
export async function deleteSessionByTokenHash(db, tokenHash) {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

// Fait le ménage des sessions expirées d'un membre, pour que la table ne
// grossisse pas sans fin. Reçoit le pool et l'identifiant du membre.
// Ne renvoie rien.
export async function deleteExpiredSessions(db, userId) {
  await db.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()', [userId]);
}
