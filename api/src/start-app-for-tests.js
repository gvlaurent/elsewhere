// Rôle : outils partagés par les tests de l'API. N'est jamais chargé par
// l'application elle-même. Son nom évite le motif « test-*.js » que
// node --test exécuterait comme un fichier de test.
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

// Envoie un POST avec un corps JSON déjà écrit en texte (pour pouvoir
// envoyer aussi du JSON mal formé). Reçoit l'adresse complète, le texte du
// corps et, au besoin, un autre Content-Type. Renvoie le code HTTP et le
// corps de la réponse lu en JSON.
export async function postJson(url, rawBody, contentType = 'application/json') {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: rawBody,
  });
  return { status: response.status, json: await response.json() };
}
