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
// envoyer aussi du JSON mal formé ou un Content-Type piégé, ce que
// sendRequest, plus bas, ne permet pas exprès). Reçoit l'adresse complète, le texte du
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

// Envoie une requête à l'API comme le ferait le navigateur, cookie compris.
// Reçoit l'adresse complète et, au besoin, { method, body, cookie } : body
// est un objet converti en JSON, cookie le texte « nom=valeur » à renvoyer.
// Renvoie le code HTTP, le corps lu en JSON (null s'il est vide, comme pour
// un 204) et les en-têtes Set-Cookie posés par la réponse.
export async function sendRequest(url, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : null,
    setCookies: response.headers.getSetCookie(),
  };
}
