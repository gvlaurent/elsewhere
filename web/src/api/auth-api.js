// Rôle : les appels de comptes (inscription, connexion, déconnexion, qui
// est connecté), un par route de l'API décrite dans docs/architecture.md.
// Chaque fonction passe par apiRequest() et renvoie seulement ce qui sert
// à l'écran : le membre ({ id, email, role, consentAt, createdAt }).
import { ApiError, apiRequest } from './api-client.js'

// Inscrit un membre. Reçoit { email, password, consent } ; consent doit
// être true, sinon l'API refuse (400). Renvoie le membre, déjà connecté :
// l'API a posé le cookie de session.
export async function register({ email, password, consent }) {
  const { user } = await apiRequest('/auth/register', { method: 'POST', body: { email, password, consent } })
  return user
}

// Connecte un membre. Reçoit { email, password } ; renvoie le membre.
// Lève une ApiError 401 (identifiants faux) ou 429 (trop d'essais).
export async function logIn({ email, password }) {
  const { user } = await apiRequest('/auth/login', { method: 'POST', body: { email, password } })
  return user
}

// Déconnecte : l'API supprime la session en base et efface le cookie.
// Ne reçoit rien, ne renvoie rien.
export async function logOut() {
  await apiRequest('/auth/logout', { method: 'POST' })
}

// Demande à l'API qui est connecté. Ne reçoit rien ; renvoie le membre, ou
// null si personne ne l'est (401). Les autres erreurs remontent.
export async function getCurrentUser() {
  try {
    const { user } = await apiRequest('/auth/me')
    return user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
