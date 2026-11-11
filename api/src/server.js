// Rôle : point d'entrée de l'API. Importe l'application et la met à l'écoute
// d'un port réseau. C'est le seul fichier lancé par « npm start ».
import app from './app.js';

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`API Elsewhere à l'écoute sur http://localhost:${port}`);
});
