// Rôle : gestion d'erreurs centrale de l'API, branchée en dernier dans app.js.
// Toute erreur, quelle que soit la couche qui l'a lancée, finit ici et repart
// au client au même format : { error: { message, details } }.
import { HttpError } from '../errors/http-error.js';

// Traduit une erreur en réponse JSON. Express la reconnaît comme gestion
// d'erreurs à ses quatre paramètres : (err, req, res, next). Trois cas :
// - HttpError (erreur prévue) : son code, son message et ses détails ;
//   une HttpError 5xx est aussi journalisée, pour garder une trace ;
// - erreur de lecture du corps par express.json (JSON mal formé, corps trop
//   gros, encodage inconnu), reconnue à son champ type : son code 4xx, avec
//   un message fixe ;
// - toute autre erreur (imprévue, même si elle porte un code 4xx) : 500 et
//   un message générique, détail dans les journaux.
// Ne renvoie rien : la réponse part par res.
export function errorHandler(err, req, res, next) {
  // Si la réponse a déjà commencé à partir, on ne peut plus la changer :
  // Express ferme alors la connexion lui-même.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) logError(req, err);
    return sendError(res, err.status, err.message, err.details);
  }

  if (isBodyReadingError(err)) {
    const message = err.type === 'entity.parse.failed' ? 'JSON mal formé' : 'Requête refusée';
    return sendError(res, err.status, message);
  }

  // Sécurité : le détail d'une erreur imprévue (message technique, pile
  // d'appels, adresse de la base…) part dans les journaux du serveur et
  // jamais au client, qui pourrait s'en servir pour attaquer.
  logError(req, err);
  sendError(res, 500, 'Erreur interne du serveur');
}

// Les erreurs d'express.json portent un champ type (« entity.parse.failed »,
// « entity.too.large »…) et un code 4xx. On ne fait confiance qu'à elles :
// un code 4xx posé par une autre bibliothèque reste une erreur imprévue.
function isBodyReadingError(err) {
  return typeof err.type === 'string' && err.status >= 400 && err.status < 500;
}

// Écrit l'erreur complète dans les journaux du serveur, avec la requête.
function logError(req, err) {
  console.error(`Erreur sur ${req.method} ${req.originalUrl}`, err);
}

// Écrit la réponse d'erreur au format commun de l'API.
function sendError(res, status, message, details = []) {
  res.status(status).json({ error: { message, details } });
}
