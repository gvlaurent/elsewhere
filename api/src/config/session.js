// Rôle : réglages de la session de connexion, partagés par le service des
// comptes (durée) et la couche HTTP (nom et options du cookie). Les choix
// sont expliqués dans l'ADR-0004.

// Durée de vie d'une session : 30 jours. Passé ce délai, il faut se
// reconnecter. En millisecondes, l'unité de Date et de res.cookie.
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Nom du cookie qui transporte le jeton de session.
export const SESSION_COOKIE = 'elsewhere_session';

// Options du cookie, lues par Express (res.cookie et res.clearCookie, qui
// doivent recevoir les mêmes pour viser le même cookie). Sécurité :
// - httpOnly : le JavaScript de la page ne peut pas lire le cookie ; un
//   script injecté (faille XSS) ne peut donc pas voler la session ;
// - secure : le navigateur ne l'envoie qu'en HTTPS (et sur localhost,
//   que les navigateurs traitent comme sûr en développement) ;
// - sameSite 'lax' : il n'est pas envoyé quand un autre site déclenche
//   un POST vers Elsewhere, ce qui bloque la falsification de requête
//   (CSRF) ;
// - path '/api' : il n'accompagne que les appels à l'API.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/api',
};
