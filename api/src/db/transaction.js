// Rôle : outil de la couche base de données pour faire plusieurs écritures
// en « tout ou rien » (une transaction). Utilisé par le service
// d'importation des stations : si une écriture échoue au milieu, aucune des
// précédentes n'est gardée, et la base reste comme avant l'importation.
// Comme migrate.js, c'est de l'outillage de base : il n'écrit que BEGIN,
// COMMIT et ROLLBACK, jamais de requête métier.

// Lance un travail dans une transaction.
// Reçoit le pool et une fonction asynchrone work(client), qui fait ses
// requêtes avec ce client (et non avec le pool). Renvoie ce que renvoie
// work. Si work lève une erreur, tout est annulé et l'erreur remonte.
export async function withTransaction(pool, work) {
  // Une seule connexion pour toute la transaction : BEGIN, les requêtes et
  // COMMIT doivent passer par la même, sinon la transaction ne tient pas.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release(); // rend la connexion au pool, même en cas d'erreur
  }
}
