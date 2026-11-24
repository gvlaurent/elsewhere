// Rôle : middleware branché après toutes les routes de l'API. Une requête
// qui arrive jusqu'ici ne correspond à aucune route : on répond 404 en JSON
// plutôt qu'avec la page HTML par défaut d'Express.
import { HttpError } from '../errors/http-error.js';

// Reçoit la requête qu'aucune route n'a traitée et transmet une HttpError 404
// à la gestion d'erreurs centrale. Ne répond pas lui-même.
export function notFound(req, res, next) {
  next(new HttpError(404, 'Ressource introuvable'));
}
