// Rôle : middleware qui freine les essais de mots de passe en série sur la
// connexion (attaque « par force brute »). Branché sur POST /api/auth/login,
// après la validation : il compte les échecs par e-mail visé.
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../errors/http-error.js';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 10;

// Fabrique le limiteur. Ne reçoit rien ; renvoie un middleware Express.
// Chaque appel crée un compteur neuf, gardé en mémoire : chaque application
// en fabrique un (voir auth-routes.js), ce qui isole aussi chaque test.
// Limite connue : le compteur repart à zéro quand le serveur redémarre.
// - Au-delà de 10 échecs en 15 minutes pour un même e-mail, toute tentative
//   est refusée (429), même avec le bon mot de passe : l'attaquant ne peut
//   pas savoir si son dernier essai était le bon.
// - Une connexion réussie ne compte pas (skipSuccessfulRequests).
export function createLoginRateLimit() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: MAX_FAILED_ATTEMPTS,
    skipSuccessfulRequests: true,
    // On compte par e-mail visé, pas par adresse IP : derrière les relais de
    // Render, l'IP vue par l'API n'est pas fiable, et un attaquant peut en
    // changer facilement. L'e-mail a déjà été mis en minuscules par la
    // validation. Limite connue : quelqu'un peut bloquer un compte 15 minutes
    // en le visant exprès.
    keyGenerator: (req) => req.validated.body.email,
    // L'e-mail sert de clé : on coupe le contrôle de la bibliothèque qui
    // attend une adresse IP et l'en-tête X-Forwarded-For.
    validate: { xForwardedForHeader: false, ip: false },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Le refus suit le chemin de toutes les erreurs : format commun de l'API.
    handler: (req, res, next) => {
      next(new HttpError(429, 'Trop de tentatives de connexion. Réessaie dans 15 minutes.'));
    },
  });
}
