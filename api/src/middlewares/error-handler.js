// Rôle : gestion d'erreurs centrale de l'API, branchée en dernier dans app.js.
// Toute erreur, quelle que soit la couche qui l'a lancée, finit ici et repart
// au client au même format : { error: { message, details } }.
import { HttpError } from '../errors/http-error.js';

// Traduit une erreur en réponse JSON. Express la reconnaît comme gestion
// d'erreurs à ses quatre paramètres : (err, req, res, next). Trois cas :
// - HttpError (erreur prévue) : son code, son message et ses détails ;
// - erreur de lecture du corps par express.json (JSON mal formé, corps trop
//   gros) : son code 4xx, avec un message fixe ;
// - toute autre erreur (imprévue) : 500 et un message générique.
// Ne renvoie rien : la réponse part par res.
export function errorHandler(err, req, res, next) {
  // Si la réponse a déjà commencé à partir, on ne peut plus la changer :
  // Express ferme alors la connexion lui-même.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    return sendError(res, err.status, err.message, err.details);
  }

  if (err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'JSON mal formé' : 'Requête refusée';
    return sendError(res, err.status, message);
  }

  // Sécurité : le détail d'une erreur imprévue (message technique, pile
  // d'appels, adresse de la base…) part dans les journaux du serveur et
  // jamais au client, qui pourrait s'en servir pour attaquer.
  console.error(`Erreur interne sur ${req.method} ${req.originalUrl}`, err);
  sendError(res, 500, 'Erreur interne du serveur');
}

// Écrit la réponse d'erreur au format commun de l'API.
function sendError(res, status, message, details = []) {
  res.status(status).json({ error: { message, details } });
}
