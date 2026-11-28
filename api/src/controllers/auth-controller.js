// Rôle : couche « contrôleurs » des comptes. Fait le lien entre HTTP et le
// service : lit les données validées (req.validated) et le cookie, appelle
// auth-service.js, puis écrit la réponse et pose ou efface le cookie de
// session. Aucune règle métier ici.
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_DURATION_MS,
} from '../config/session.js';
import { logIn, logOut, registerUser } from '../services/auth-service.js';

// POST /api/auth/register. Inscrit le membre, pose son cookie de session et
// répond 201 avec { user }. Un e-mail déjà inscrit part en 409 (levé par le
// service, traduit par la gestion d'erreurs centrale).
export async function register(req, res) {
  const { email, password } = req.validated.body;
  const { user, token } = await registerUser(req.app.locals.db, { email, password });
  setSessionCookie(res, token);
  res.status(201).json({ user });
}

// POST /api/auth/login. Connecte le membre, pose un nouveau cookie de
// session et répond 200 avec { user }. Mauvais identifiants : 401.
export async function login(req, res) {
  const { user, token } = await logIn(req.app.locals.db, req.validated.body);
  setSessionCookie(res, token);
  res.json({ user });
}

// POST /api/auth/logout. Supprime la session en base, efface le cookie et
// répond 204 (« fait, rien à renvoyer »), même si personne n'était connecté :
// le résultat voulu, être déconnecté, est atteint dans tous les cas.
export async function logout(req, res) {
  await logOut(req.app.locals.db, req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
  res.status(204).end();
}

// GET /api/auth/me. Renvoie le membre connecté, que requireAuth a rangé dans
// req.user. Sert à l'interface pour savoir qui est connecté au chargement.
export function me(req, res) {
  res.json({ user: req.user });
}

// Pose le cookie de session. Reçoit la réponse et le jeton. maxAge fait
// durer le cookie autant que la session en base : 30 jours.
function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_DURATION_MS });
}
