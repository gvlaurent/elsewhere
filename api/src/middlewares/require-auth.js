// Rôle : middleware d'authentification, branché sur une route avant son
// contrôleur. Il répond à « qui es-tu ? » à partir du cookie de session, et
// refuse la requête (401) si personne n'est connecté. Il ne décide d'aucun
// droit : « as-tu le droit de toucher à ça ? » reste le travail du service.
import { HttpError } from '../errors/http-error.js';
import { SESSION_COOKIE } from '../config/session.js';
import { findMemberBySessionToken } from '../services/auth-service.js';

// Middleware Express. Lit le jeton dans le cookie (déjà découpé par
// cookie-parser, voir app.js) et demande au service à qui il appartient.
// - Session valide : range le membre dans req.user, puis passe la main.
// - Pas de cookie, jeton inventé ou expiré : HttpError 401.
// Asynchrone : Express 5 transmet tout seul une promesse rejetée (base
// injoignable…) à la gestion d'erreurs centrale.
export async function requireAuth(req, res, next) {
  const user = await findMemberBySessionToken(req.app.locals.db, req.cookies[SESSION_COOKIE]);
  if (!user) {
    return next(new HttpError(401, 'Connexion requise'));
  }
  req.user = user;
  next();
}
