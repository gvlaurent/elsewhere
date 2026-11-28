// Rôle : point d'entrée de l'API. Crée le pool de connexions à la base,
// fabrique l'application avec lui et la met à l'écoute d'un port réseau.
// C'est le seul fichier lancé par « npm start ».
import { createApp } from './app.js';
import { createPool } from './db/pool.js';

const port = process.env.PORT ?? 3000;
const app = createApp({ db: createPool() });

app.listen(port, () => {
  console.log(`API Elsewhere à l'écoute sur http://localhost:${port}`);
});
