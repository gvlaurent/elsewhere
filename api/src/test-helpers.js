// Rôle : outils partagés par les tests de l'API. N'est jamais chargé par
// l'application elle-même.
import { once } from 'node:events';

// Démarre une application Express sur un port libre (0 = le système choisit)
// et la referme à la fin du test, quoi qu'il arrive. Reçoit le contexte du
// test et l'application ; renvoie l'adresse de base, par exemple
// http://localhost:41237, à laquelle on ajoute le chemin de la requête.
export async function startApp(t, app) {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => server.close());
  return `http://localhost:${server.address().port}`;
}
