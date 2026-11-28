// Rôle : couche d'accès aux données des moments (table moments, F5 et F6).
// Seule couche qui écrit du SQL pour les moments ; elle ne décide d'aucune
// règle métier (quel titre garder, quand répondre 404 : c'est le travail
// de moments-service.js).
//
// Accès propriétaire : chaque lecture et chaque suppression filtre par
// user_id. Il n'existe aucune fonction qui lise ou supprime un moment par
// son seul identifiant : impossible, depuis ce fichier, de toucher au
// moment d'un autre membre.
//
// Toutes les requêtes sont paramétrées ($1, $2…) : les valeurs voyagent à
// part du texte SQL et ne sont jamais lues comme du SQL.
//
// Chaque fonction reçoit en premier « db » : le pool de l'application ou
// celui de la base jetable d'un test.

// Colonnes renvoyées au reste de l'API, renommées en camelCase. user_id n'y
// est pas : le propriétaire est déjà connu de l'appelant, et il n'a pas à
// partir vers le navigateur.
//
// local_time est une date et heure sans fuseau (« 21 h 30 à Lagos »). pg
// la convertirait en Date JavaScript dans le fuseau du serveur, ce qui la
// fausserait : on la renvoie donc en texte, au format ISO sans fuseau
// (2026-11-28T21:30:00), tel qu'on l'affichera.
const PUBLIC_COLUMNS = `
  id,
  station_id AS "stationId",
  theme_id AS "themeId",
  station_name AS "stationName",
  place_name AS "placeName",
  country_code AS "countryCode",
  country_name AS "countryName",
  theme_name AS "themeName",
  track_title AS "trackTitle",
  kept_at AS "keptAt",
  to_char(local_time, 'YYYY-MM-DD"T"HH24:MI:SS') AS "localTime"`;

// Enregistre un moment. Reçoit db et { userId, stationId, themeId,
// stationName, placeName, countryCode, countryName, themeName, trackTitle,
// keptAt, timezone } : les copies et le titre sont déjà choisis par le
// service ; themeId, themeName et trackTitle peuvent valoir null. Renvoie
// le moment créé (sans user_id), avec son heure locale.
export async function createMoment(db, moment) {
  const { rows } = await db.query(
    // AT TIME ZONE : appliqué à un instant (timestamptz) et à un fuseau IANA
    // (Africa/Lagos), il donne l'heure affichée sur place à cet instant,
    // heure d'été comprise. C'est PostgreSQL qui tient à jour les règles
    // des fuseaux, pas notre code. ($10::timestamptz : le même paramètre
    // sert deux fois, on précise son type pour le calcul.)
    `INSERT INTO moments (
       user_id, station_id, theme_id, station_name, place_name,
       country_code, country_name, theme_name, track_title, kept_at, local_time
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10::timestamptz AT TIME ZONE $11)
     RETURNING ${PUBLIC_COLUMNS}`,
    [
      moment.userId,
      moment.stationId,
      moment.themeId,
      moment.stationName,
      moment.placeName,
      moment.countryCode,
      moment.countryName,
      moment.themeName,
      moment.trackTitle,
      moment.keptAt,
      moment.timezone,
    ],
  );
  return rows[0];
}

// Liste les moments d'un membre, du plus récent au plus ancien (F6).
// Reçoit db et l'identifiant du membre. Renvoie un tableau, vide s'il n'a
// rien gardé.
export async function listMomentsOfUser(db, userId) {
  const { rows } = await db.query(
    // L'index moments_user_id_kept_at_idx (migration 001) sert exactement
    // ce filtre et ce tri. « id DESC » départage deux moments gardés au
    // même instant, pour un ordre toujours identique.
    `SELECT ${PUBLIC_COLUMNS}
     FROM moments
     WHERE user_id = $1
     ORDER BY kept_at DESC, id DESC`,
    [userId],
  );
  return rows;
}

// Supprime un moment, seulement s'il appartient au membre. Reçoit db et
// { userId, momentId }. Renvoie true si un moment a été supprimé, false
// s'il n'existe pas ou appartient à un autre membre : le repository ne
// distingue pas les deux cas, et n'a pas à le faire (ADR-0009).
export async function deleteMomentOfUser(db, { userId, momentId }) {
  // Sécurité : le filtre sur user_id est dans la même requête que la
  // suppression. Il n'y a pas de « lire, vérifier, puis supprimer » qui
  // laisserait une fenêtre entre la vérification et l'action.
  const { rowCount } = await db.query(
    'DELETE FROM moments WHERE id = $1 AND user_id = $2',
    [momentId, userId],
  );
  return rowCount > 0;
}
