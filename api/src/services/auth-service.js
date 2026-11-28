// Rôle : couche « services » des comptes (F4) : les règles de l'inscription,
// de la connexion et de la déconnexion. Ne connaît pas HTTP (ni req, ni res,
// ni cookie) : il reçoit des données déjà validées et renvoie le membre et
// son jeton de session ; le contrôleur s'occupe du cookie.
//
// Chaque fonction reçoit en premier « db », le pool de connexions, qu'elle
// passe à la couche d'accès aux données.
import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../errors/http-error.js';
import { PG_ERROR } from '../db/postgres-error-codes.js';
import { SESSION_DURATION_MS } from '../config/session.js';
import { hashPassword, verifyPassword } from './password-hashing.js';
import { createUser, findUserByEmail } from '../repositories/users-repository.js';
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  findUserBySessionTokenHash,
} from '../repositories/sessions-repository.js';

// Même message pour un e-mail inconnu et un mauvais mot de passe : la
// réponse ne doit pas révéler quels e-mails ont un compte.
const INVALID_CREDENTIALS = 'E-mail ou mot de passe incorrect';

// Hash d'un mot de passe que personne n'a, lancé dès le chargement du
// module. Il sert quand l'e-mail est inconnu : on vérifie quand même un
// mot de passe, pour que la réponse prenne le même temps que pour un vrai
// compte. Sinon, un attaquant devinerait les e-mails inscrits au chronomètre.
const decoyHashPromise = hashPassword(randomBytes(32).toString('hex'));

// Inscrit un nouveau membre et le connecte aussitôt. Reçoit le pool et
// { email, password } déjà validés (le consentement a été vérifié par le
// schéma de la route). Renvoie { user, token } : le compte, sans son hash,
// et le jeton de session à poser dans le cookie. Lève une HttpError 409 si
// l'e-mail a déjà un compte.
export async function registerUser(db, { email, password }) {
  const passwordHash = await hashPassword(password);
  let user;
  try {
    // La date du consentement est celle du serveur, au moment de
    // l'inscription : le navigateur ne peut pas en imposer une autre (C2).
    user = await createUser(db, { email, passwordHash, consentAt: new Date() });
  } catch (error) {
    // L'index unique de la base est le vrai garde-fou : deux inscriptions
    // simultanées avec le même e-mail ne peuvent pas passer toutes les deux.
    if (error.code === PG_ERROR.UNIQUE_VIOLATION) {
      throw new HttpError(409, 'Un compte existe déjà avec cet e-mail');
    }
    throw error;
  }
  const token = await openSession(db, user.id);
  return { user, token };
}

// Connecte un membre. Reçoit le pool et { email, password }. Renvoie
// { user, token } comme registerUser. Lève une HttpError 401, avec le même
// message, si l'e-mail est inconnu ou si le mot de passe est faux.
export async function logIn(db, { email, password }) {
  const found = await findUserByEmail(db, email);
  const isValid = await verifyPassword(found?.passwordHash ?? (await decoyHashPromise), password);
  if (!found || !isValid) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  // Le hash du mot de passe ne sort pas du service.
  const user = { ...found };
  delete user.passwordHash;

  await deleteExpiredSessions(db, user.id);
  const token = await openSession(db, user.id);
  return { user, token };
}

// Déconnecte : supprime la session en base. Reçoit le pool et le jeton lu
// dans le cookie (ou undefined s'il n'y en a pas). Ne renvoie rien. Même
// si quelqu'un a copié le cookie, il ne servira plus à rien (C1).
export async function logOut(db, token) {
  if (!token) return;
  await deleteSessionByTokenHash(db, fingerprintOf(token));
}

// Retrouve le membre d'un jeton de session. Reçoit le pool et le jeton lu
// dans le cookie. Renvoie le compte, ou null si le jeton est absent,
// inventé ou expiré.
export async function findUserBySessionToken(db, token) {
  if (!token) return null;
  return findUserBySessionTokenHash(db, fingerprintOf(token));
}

// Ouvre une session pour un membre. Reçoit le pool et son identifiant ;
// renvoie le jeton, à ne donner qu'au navigateur.
async function openSession(db, userId) {
  // Sécurité : 32 octets tirés par le générateur aléatoire cryptographique
  // du système, soit 256 bits. Impossible à deviner, même en essayant des
  // milliards de valeurs. base64url : lettres, chiffres, « - » et « _ »,
  // utilisables tels quels dans un cookie (43 caractères).
  const token = randomBytes(32).toString('base64url');
  await createSession(db, {
    userId,
    tokenHash: fingerprintOf(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return token;
}

// Empreinte SHA-256 d'un jeton, en hexadécimal : c'est elle que la base
// garde. Un hachage rapide suffit ici, contrairement au mot de passe : le
// jeton est déjà aléatoire et long, il n'y a rien à deviner par essais.
function fingerprintOf(token) {
  return createHash('sha256').update(token).digest('hex');
}
