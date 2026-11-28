// Rôle : rassemble toutes les routes de l'API sous un seul routeur.
// app.js n'importe que ce fichier : ajouter une ressource se fait ici.
import { Router } from 'express';
import healthRoutes from './health-routes.js';
import { createAuthRoutes } from './auth-routes.js';

// Fabrique le routeur de l'API. Ne reçoit rien ; renvoie un routeur Express
// neuf à chaque appel (voir createAuthRoutes).
export function createRoutes() {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/auth', createAuthRoutes());

  return router;
}
