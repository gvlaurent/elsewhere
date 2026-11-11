// Rôle : crée et configure l'application Express (routes, middlewares).
// Ne démarre aucun serveur : server.js s'en charge, ce qui permet aux tests
// d'utiliser l'application sans ouvrir de port.
import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;