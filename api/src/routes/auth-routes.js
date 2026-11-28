// Rôle : couche « routes » des comptes (F4). Associe chaque adresse sous
// /api/auth à son contrôleur, et branche avant lui les middlewares :
// validation des entrées (400), limite des essais (429), connexion
// requise (401).
import { Router } from 'express';
import { z } from '../config/zod.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { createLoginRateLimit } from '../middlewares/login-rate-limit.js';
import { login, logout, me, register } from '../controllers/auth-controller.js';

// L'e-mail est nettoyé avant d'être vérifié : espaces retirés et minuscules,
// pour que « Julien@x.com » et « julien@x.com » soient le même compte.
// 254 caractères : la longueur maximale d'une adresse e-mail.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

const registerBody = z.object({
  email,
  // 12 caractères au moins : sans second facteur, la longueur est la
  // meilleure défense. 128 au plus, pour qu'un texte énorme ne coûte pas
  // un hachage interminable.
  password: z.string().min(12).max(128),
  // Case de consentement cochée par le membre lui-même (C2) : seul true
  // est accepté, jamais une valeur par défaut.
  consent: z.literal(true, { error: 'Le consentement est obligatoire pour créer un compte' }),
});

const loginBody = z.object({
  email,
  // Aucune règle de longueur minimale à la connexion : la réponse ne doit
  // rien apprendre à un attaquant sur les règles des mots de passe.
  password: z.string().min(1).max(128),
});

// Fabrique le routeur des comptes. Ne reçoit rien ; renvoie un routeur
// Express. C'est une fabrique, et non un routeur unique, pour que chaque
// application (et chaque test) ait son propre compteur d'essais.
export function createAuthRoutes() {
  const router = Router();

  router.post('/register', validate({ body: registerBody }), register);
  router.post('/login', validate({ body: loginBody }), createLoginRateLimit(), login);
  router.post('/logout', logout);
  router.get('/me', requireAuth, me);

  return router;
}
