// Rôle : couche d'accès aux données des stations (table stations). Seule
// couche qui écrit du SQL pour les stations ; elle ne décide d'aucune règle
// métier (quelles stations garder : c'est station-selection.js).
// Toutes les requêtes sont paramétrées ($1, $2…) : les valeurs voyagent à
// part du texte SQL et ne sont jamais lues comme du SQL.
//
// Chaque fonction reçoit en premier « db » : le pool de l'application, un
// client de transaction, ou le pool de la base jetable d'un test.

// Enregistre les stations d'un lieu : ajoute les nouvelles, met à jour
// celles qui ont changé, ne touche pas aux autres.
// Reçoit db (le pool ou un client de transaction), l'identifiant du lieu et
// une liste de stations { externalId, name, streamUrl, homepageUrl }, sans
// doublon d'externalId.
// Renvoie { inserted, updated } : le nombre de lignes créées et modifiées.
export async function upsertStations(db, placeId, stations) {
  if (stations.length === 0) return { inserted: 0, updated: 0 };

  const { rows } = await db.query(
    // Une seule requête pour toute la liste : unnest transforme les quatre
    // tableaux reçus en lignes (le 1er élément de chaque tableau forme la
    // 1re ligne, etc.). Les tableaux sont des paramètres, donc toujours
    // séparés du texte SQL. Une seule requête = tout ou rien.
    //
    // ON CONFLICT (external_id) : une station déjà connue (même stationuuid)
    // est mise à jour au lieu d'être ajoutée une deuxième fois. Le statut
    // n'est jamais modifié ici : une station masquée par un admin le reste.
    //
    // WHERE … IS DISTINCT FROM : on ne réécrit une station que si quelque
    // chose a changé. Sinon, le déclencheur changerait updated_at pour rien,
    // et le rapport annoncerait des mises à jour qui n'en sont pas.
    // IS DISTINCT FROM compare aussi correctement les valeurs NULL.
    `INSERT INTO stations (external_id, place_id, name, stream_url, homepage_url)
     SELECT s.external_id, $1, s.name, s.stream_url, s.homepage_url
     FROM unnest($2::uuid[], $3::text[], $4::text[], $5::text[])
       AS s(external_id, name, stream_url, homepage_url)
     ON CONFLICT (external_id) DO UPDATE
       SET place_id = EXCLUDED.place_id,
           name = EXCLUDED.name,
           stream_url = EXCLUDED.stream_url,
           homepage_url = EXCLUDED.homepage_url
       WHERE (stations.place_id, stations.name, stations.stream_url, stations.homepage_url)
         IS DISTINCT FROM
             (EXCLUDED.place_id, EXCLUDED.name, EXCLUDED.stream_url, EXCLUDED.homepage_url)
     -- Contournement connu de PostgreSQL : la colonne système xmax vaut 0
     -- sur une ligne tout juste insérée, et autre chose sur une ligne mise
     -- à jour. C'est la façon habituelle de distinguer les deux cas dans
     -- un même INSERT … ON CONFLICT.
     RETURNING (xmax = 0) AS inserted`,
    [
      placeId,
      stations.map((station) => station.externalId),
      stations.map((station) => station.name),
      stations.map((station) => station.streamUrl),
      stations.map((station) => station.homepageUrl),
    ],
  );

  const inserted = rows.filter((row) => row.inserted).length;
  return { inserted, updated: rows.length - inserted };
}

// Stations actives d'un lieu, triées par nom (tableau du direct, F1).
// Reçoit db et l'identifiant du lieu. Renvoie [{ id, name, streamUrl,
// homepageUrl, lastTitle, lastTitleReadAt }] : le titre brut et l'heure de
// sa lecture, que le service filtre avec freshTitle (fresh-title.js). La
// règle des 5 minutes n'est pas écrite ici, en SQL : elle n'existe qu'à un
// seul endroit. Une station masquée par un admin n'est jamais renvoyée.
export async function findActiveStationsByPlace(db, placeId) {
  const { rows } = await db.query(
    `SELECT id, name, stream_url AS "streamUrl", homepage_url AS "homepageUrl",
            last_title AS "lastTitle", last_title_read_at AS "lastTitleReadAt"
     FROM stations
     WHERE place_id = $1 AND status = 'active'
     ORDER BY name, id`,
    [placeId],
  );
  return rows;
}
