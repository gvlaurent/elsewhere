// Rôle : crée et configure l'application Express (middlewares, routes).
// Ne démarre aucun serveur : server.js s'en charge, ce qui permet aux tests
// d'utiliser l'application sans ouvrir de port.
import express from 'express';
import cookieParser from 'cookie-parser';
import { createRoutes } from './routes/index.js';
import { notFound } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';

// Fabrique l'application. Reçoit { db }, le pool de connexions à la base :
// server.js passe celui de la vraie base, un test celui de sa base jetable.
// db peut manquer pour un test qui ne touche pas la base (santé, 404).
// Renvoie l'application Express, prête à être mise à l'écoute.
export function createApp({ db } = {}) {
  const app = express();

  // Le pool est rangé dans app.locals : les contrôleurs et les middlewares
  // le retrouvent par req.app.locals.db et le passent aux services.
  app.locals.db = db;

  // Lit les corps JSON envoyés par le navigateur. Sécurité : la taille est
  // bornée, pour qu'un corps énorme ne puisse pas saturer le serveur.
  app.use(express.json({ limit: '100kb' }));
  // Découpe l'en-tête Cookie en un objet req.cookies (nom → valeur).
  app.use(cookieParser());

  // Toutes les routes de l'API commencent par /api : l'interface React
  // les distingue ainsi de ses propres pages.
  app.use('/api', createRoutes());
  app.use('/api', notFound);

  // En dernier : toute erreur lancée plus haut arrive ici.
  app.use(errorHandler);

  return app;
}
