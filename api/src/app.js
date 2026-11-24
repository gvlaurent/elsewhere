// Rôle : crée et configure l'application Express (middlewares, routes).
// Ne démarre aucun serveur : server.js s'en charge, ce qui permet aux tests
// d'utiliser l'application sans ouvrir de port.
import express from 'express';
import routes from './routes/index.js';
import { notFound } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';

const app = express();

// Lit les corps JSON envoyés par le navigateur. Sécurité : la taille est
// bornée, pour qu'un corps énorme ne puisse pas saturer le serveur.
app.use(express.json({ limit: '100kb' }));

// Toutes les routes de l'API commencent par /api : l'interface React
// les distingue ainsi de ses propres pages.
app.use('/api', routes);
app.use('/api', notFound);

// En dernier : toute erreur lancée plus haut arrive ici.
app.use(errorHandler);

export default app;
