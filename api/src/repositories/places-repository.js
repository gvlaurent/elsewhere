// Rôle : couche d'accès aux données des lieux (table places). Seule couche
// qui écrit du SQL pour les lieux ; elle ne décide d'aucune règle métier.
// Toutes les requêtes sont paramétrées ($1, $2…) : les valeurs voyagent à
// part du texte SQL et ne sont jamais lues comme du SQL.
//
// Chaque fonction reçoit en premier « db » : le pool de l'application, un
// client de transaction, ou le pool de la base jetable d'un test.

// Colonnes renvoyées au reste de l'API, renommées en camelCase.
const COLUMNS = `
  id, name, country_code AS "countryCode", country_name AS "countryName", timezone`;

// Crée un lieu, ou met à jour celui qui a déjà ce nom dans ce pays.
// Reçoit db (le pool ou un client de transaction) et
// { name, countryCode, countryName, timezone }.
// Renvoie le lieu enregistré, avec son identifiant.
export async function upsertPlace(db, { name, countryCode, countryName, timezone }) {
  const { rows } = await db.query(
    // ON CONFLICT (country_code, name) : s'appuie sur la contrainte UNIQUE
    // de la table (migration 001). Si le lieu existe, on met à jour son
    // pays et son fuseau au lieu d'échouer. DO UPDATE (et non DO NOTHING)
    // pour que RETURNING renvoie la ligne existante.
    `INSERT INTO places (name, country_code, country_name, timezone)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (country_code, name) DO UPDATE
       SET country_name = EXCLUDED.country_name,
           timezone = EXCLUDED.timezone
     RETURNING ${COLUMNS}`,
    [name, countryCode, countryName, timezone],
  );
  return rows[0];
}
