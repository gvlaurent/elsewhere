// Rôle : donne un nom aux codes d'erreur de PostgreSQL dont l'API a besoin.
// Quand la base refuse une donnée, pg lève une erreur dont la propriété
// « code » est un code à 5 caractères (norme SQLSTATE), par exemple '23505'.
// Les services (ELS-17 : « cet e-mail a déjà un compte ») et les tests les
// comparent à ces constantes plutôt qu'à des chaînes recopiées partout.
//
// Liste complète : https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_ERROR = Object.freeze({
  // Une valeur existe déjà là où elle doit être unique (e-mail, nom de liste…).
  UNIQUE_VIOLATION: '23505',
  // Une règle CHECK refuse la valeur (rôle inconnu, titre sans heure…).
  CHECK_VIOLATION: '23514',
  // Une clé étrangère est violée : la ligne visée n'existe pas, ou une
  // suppression est bloquée par ON DELETE RESTRICT. Piège : PostgreSQL ne
  // lève pas « restrict_violation » (23001) dans ce second cas, mais ce code.
  FOREIGN_KEY_VIOLATION: '23503',
});
