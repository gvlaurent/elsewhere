// Rôle : couche d'accès aux données des thèmes (table themes, liste fermée
// remplie par migration). Seule couche qui écrit du SQL pour les thèmes ;
// elle ne décide d'aucune règle métier. Requêtes paramétrées ($1…) : les
// valeurs ne sont jamais lues comme du SQL.
//
// Chaque fonction reçoit en premier « db » : le pool de l'application ou
// celui de la base jetable d'un test.

// Cherche un thème par son identifiant. Reçoit db et l'identifiant.
// Renvoie { id, name }, ou null s'il n'existe pas. Sert à copier le nom du
// thème d'entrée dans un moment (ELS-19).
export async function findThemeById(db, themeId) {
  const { rows } = await db.query('SELECT id, name FROM themes WHERE id = $1', [themeId]);
  return rows[0] ?? null;
}
