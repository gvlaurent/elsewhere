// Rôle : crée et configure l'application Express (middlewares, routes).
// Ne démarre aucun serveur : server.js s'en charge, ce qui permet aux tests
// d'utiliser l'application sans ouvrir de port.
import express from 'express';
import routes from './routes/index.js';

const app = express();

// Toutes les routes de l'API commencent par /api : l'interface React
// les distingue ainsi de ses propres pages.
app.use('/api', routes);

export default app;
