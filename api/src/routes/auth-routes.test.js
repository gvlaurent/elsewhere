// Rôle : vérifie les comptes de bout en bout, par HTTP, comme le navigateur :
// inscription, connexion, « qui suis-je ? » et déconnexion, sur l'application
// assemblée (createApp) branchée à une base jetable. C'est ici que vivent les
// tests de sécurité de l'authentification : hash, cookie, refus, session
// invalidée côté serveur, tentatives limitées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { startApp, sendRequest } from '../start-app-for-tests.js';
import { startTestDatabase, requiresDatabase } from '../db/start-database-for-tests.js';

const JULIEN = {
  email: 'julien@example.com',
  password: 'radio de Lagos le soir',
  consent: true,
};

// Démarre l'API sur une base jetable. Reçoit le contexte du test ; renvoie
// { db, url } : le pool, pour regarder dans la base, et une fonction qui
// complète un chemin (« /api/auth/me ») en adresse complète.
async function startAuthApi(t) {
  const db = await startTestDatabase(t);
  const baseUrl = await startApp(t, createApp({ db }));
  return { db, url: (path) => `${baseUrl}${path}` };
}

// Extrait du premier Set-Cookie le couple « nom=valeur », à renvoyer tel
// quel dans l'en-tête Cookie des requêtes suivantes, comme un navigateur.
function cookieFrom(response) {
  return response.setCookies[0].split(';')[0];
}

// Inscrit Julien et renvoie son cookie de session.
async function registerJulien(url) {
  const response = await sendRequest(url('/api/auth/register'), { method: 'POST', body: JULIEN });
  assert.equal(response.status, 201);
  return cookieFrom(response);
}

test('l\'inscription crée le compte, renvoie le membre et ouvre une session', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);

  const response = await sendRequest(url('/api/auth/register'), { method: 'POST', body: JULIEN });

  assert.equal(response.status, 201);
  assert.equal(response.json.user.email, 'julien@example.com');
  assert.equal(response.json.user.role, 'member');
  assert.equal('passwordHash' in response.json.user, false);
  assert.equal(response.setCookies.length, 1);
});

test('le cookie de session est HttpOnly, Secure, SameSite=Lax et limité à /api', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);

  const response = await sendRequest(url('/api/auth/register'), { method: 'POST', body: JULIEN });

  const cookie = response.setCookies[0];
  assert.match(cookie, /^elsewhere_session=[\w-]{43};/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Lax/);
  assert.match(cookie, /; Path=\/api/);
  assert.match(cookie, /; Max-Age=2592000/); // 30 jours
});

test('la base garde un hash Argon2id du mot de passe et la date du consentement', requiresDatabase, async (t) => {
  const { db, url } = await startAuthApi(t);

  await registerJulien(url);

  const { rows } = await db.query('SELECT password_hash, consent_at FROM users');
  assert.match(rows[0].password_hash, /^\$argon2id\$/);
  assert.equal(rows[0].password_hash.includes(JULIEN.password), false);
  assert.ok(Date.now() - rows[0].consent_at.getTime() < 60_000);
});

test('la base garde l\'empreinte du jeton de session, jamais le jeton', requiresDatabase, async (t) => {
  const { db, url } = await startAuthApi(t);

  const cookie = await registerJulien(url);

  const token = cookie.split('=')[1];
  const { rows } = await db.query('SELECT token_hash FROM sessions');
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, token);
  assert.match(rows[0].token_hash, /^[0-9a-f]{64}$/); // SHA-256 en hexadécimal
});

test('l\'e-mail est enregistré sans espaces ni majuscules', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);

  const response = await sendRequest(url('/api/auth/register'), {
    method: 'POST',
    body: { ...JULIEN, email: '  Julien@Example.COM ' },
  });

  assert.equal(response.json.user.email, 'julien@example.com');
});

test('un e-mail déjà inscrit est refusé avec 409, majuscules comprises', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  await registerJulien(url);

  const response = await sendRequest(url('/api/auth/register'), {
    method: 'POST',
    body: { ...JULIEN, email: 'JULIEN@example.com' },
  });

  assert.equal(response.status, 409);
  assert.equal(response.json.error.message, 'Un compte existe déjà avec cet e-mail');
  assert.deepEqual(response.setCookies, []);
});

test('l\'inscription refuse un e-mail invalide, un mot de passe court et l\'absence de consentement', requiresDatabase, async (t) => {
  const { db, url } = await startAuthApi(t);

  const response = await sendRequest(url('/api/auth/register'), {
    method: 'POST',
    body: { email: 'pas-un-email', password: 'court', consent: false },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(
    response.json.error.details.map((detail) => detail.field),
    ['email', 'password', 'consent'],
  );
  const { rows } = await db.query('SELECT count(*) AS total FROM users');
  assert.equal(rows[0].total, '0');
});

test('la connexion avec le bon mot de passe ouvre une nouvelle session', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  const registrationCookie = await registerJulien(url);

  const response = await sendRequest(url('/api/auth/login'), {
    method: 'POST',
    body: { email: 'Julien@example.com', password: JULIEN.password },
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.user.email, 'julien@example.com');
  assert.notEqual(cookieFrom(response), registrationCookie);
});

test('un mauvais mot de passe et un e-mail inconnu reçoivent la même réponse 401', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  await registerJulien(url);

  const wrongPassword = await sendRequest(url('/api/auth/login'), {
    method: 'POST',
    body: { email: JULIEN.email, password: 'pas le bon mot de passe' },
  });
  const unknownEmail = await sendRequest(url('/api/auth/login'), {
    method: 'POST',
    body: { email: 'aminata@example.com', password: JULIEN.password },
  });

  // Même code et même message : la réponse ne révèle pas quels e-mails
  // ont un compte.
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(unknownEmail.json, wrongPassword.json);
  assert.equal(wrongPassword.json.error.message, 'E-mail ou mot de passe incorrect');
  assert.deepEqual(wrongPassword.setCookies, []);
});

test('GET /api/auth/me renvoie le membre connecté', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  const cookie = await registerJulien(url);

  const response = await sendRequest(url('/api/auth/me'), { cookie });

  assert.equal(response.status, 200);
  assert.equal(response.json.user.email, 'julien@example.com');
});

test('GET /api/auth/me refuse 401 sans cookie ou avec un jeton inventé', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  await registerJulien(url);

  const withoutCookie = await sendRequest(url('/api/auth/me'));
  const forged = await sendRequest(url('/api/auth/me'), {
    cookie: 'elsewhere_session=jeton-invente-par-un-attaquant',
  });

  for (const response of [withoutCookie, forged]) {
    assert.equal(response.status, 401);
    assert.equal(response.json.error.message, 'Connexion requise');
  }
});

test('une session expirée est refusée avec 401', requiresDatabase, async (t) => {
  const { db, url } = await startAuthApi(t);
  const cookie = await registerJulien(url);

  await db.query("UPDATE sessions SET expires_at = now() - interval '1 minute'");
  const response = await sendRequest(url('/api/auth/me'), { cookie });

  assert.equal(response.status, 401);
});

test('la déconnexion invalide la session côté serveur et efface le cookie', requiresDatabase, async (t) => {
  const { db, url } = await startAuthApi(t);
  const cookie = await registerJulien(url);

  const logout = await sendRequest(url('/api/auth/logout'), { method: 'POST', cookie });

  assert.equal(logout.status, 204);
  assert.match(logout.setCookies[0], /^elsewhere_session=;/);
  assert.match(logout.setCookies[0], /Expires=Thu, 01 Jan 1970/);
  // Même si quelqu'un a gardé une copie du cookie, il ne sert plus à rien.
  const reused = await sendRequest(url('/api/auth/me'), { cookie });
  assert.equal(reused.status, 401);
  const { rows } = await db.query('SELECT count(*) AS total FROM sessions');
  assert.equal(rows[0].total, '0');
});

test('la déconnexion sans session répond aussi 204', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);

  const response = await sendRequest(url('/api/auth/logout'), { method: 'POST' });

  assert.equal(response.status, 204);
});

test('après 10 échecs de connexion sur un e-mail, la 11e tentative est refusée avec 429', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  await registerJulien(url);
  const attempt = (password) => sendRequest(url('/api/auth/login'), {
    method: 'POST',
    body: { email: JULIEN.email, password },
  });

  for (let i = 1; i <= 10; i += 1) {
    assert.equal((await attempt(`essai numéro ${i}`)).status, 401);
  }
  // Même le bon mot de passe est refusé : l'attaquant ne peut pas savoir
  // si sa 11e proposition était la bonne.
  const blocked = await attempt(JULIEN.password);

  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.error.message, 'Trop de tentatives de connexion. Réessaie dans 15 minutes.');
});

test('les échecs sur un e-mail ne bloquent pas la connexion d\'un autre membre', requiresDatabase, async (t) => {
  const { url } = await startAuthApi(t);
  await registerJulien(url);
  for (let i = 1; i <= 10; i += 1) {
    await sendRequest(url('/api/auth/login'), {
      method: 'POST',
      body: { email: 'aminata@example.com', password: `essai numéro ${i}` },
    });
  }

  const response = await sendRequest(url('/api/auth/login'), {
    method: 'POST',
    body: { email: JULIEN.email, password: JULIEN.password },
  });

  assert.equal(response.status, 200);
});
