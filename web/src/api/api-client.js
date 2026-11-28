// Rôle : le seul endroit de l'interface qui appelle l'API d'Elsewhere.
// Tous les écrans passent par apiRequest() : l'adresse (/api, sur le même
// site), l'envoi en JSON, le cookie de session et la lecture du format
// d'erreur commun de l'API ({ error: { message, details } }) sont réglés
// une seule fois, ici.
//
// Pourquoi « la même adresse » : en développement, Vite transmet /api à
// l'API locale ; en ligne, Render le transmet à l'API (ADR-0003). Le code
// de l'interface n'a donc jamais besoin de connaître l'adresse de l'API.

const API_PREFIX = '/api'

// Erreur d'un appel à l'API. Porte le code HTTP (0 si le réseau n'a pas
// répondu), le message à montrer et la liste des champs fautifs envoyée
// par l'API pour un 400 ([{ location, field, message }]).
export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// Appelle l'API. Reçoit le chemin sous /api (par exemple '/auth/login') et,
// en option, { method, body } ; body est un objet, envoyé en JSON.
// Renvoie les données JSON de la réponse, ou null pour une réponse vide
// (204). Lève une ApiError pour toute réponse d'erreur ou panne de réseau.
export async function apiRequest(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(API_PREFIX + path, {
      method,
      // Sécurité : le cookie de session (HttpOnly) n'est jamais lu par le
      // JavaScript ; 'same-origin' dit au navigateur de l'envoyer tout seul,
      // et seulement à notre propre site.
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch n'échoue que si la requête n'a pas pu partir ou n'a reçu
    // aucune réponse : réseau coupé, serveur injoignable.
    throw new ApiError(0, 'Impossible de joindre Elsewhere. Vérifiez votre connexion, puis réessayez.')
  }

  if (response.status === 204) return null

  const data = await readJson(response)
  if (response.ok) return data

  const error = data?.error
  if (error && typeof error.message === 'string') {
    throw new ApiError(response.status, error.message, Array.isArray(error.details) ? error.details : [])
  }
  // Réponse d'erreur qui ne vient pas de notre API (page HTML d'un relais,
  // serveur qui redémarre) : on ne montre pas son contenu, illisible.
  throw new ApiError(response.status, 'Le serveur ne répond pas correctement. Réessayez dans un instant.')
}

// Range les champs fautifs d'une erreur 400 par nom de champ du corps :
// { email: 'message', password: 'message' }. Reçoit n'importe quelle erreur ;
// renvoie un objet vide si ce n'est pas une ApiError avec des détails.
// Un champ qui a plusieurs erreurs garde la première : une seule cause à
// corriger à la fois, c'est plus clair.
export function fieldErrorsOf(error) {
  const errors = {}
  if (!(error instanceof ApiError)) return errors
  for (const detail of error.details) {
    if (detail.location === 'body' && detail.field && !(detail.field in errors)) {
      errors[detail.field] = detail.message
    }
  }
  return errors
}

// Lit le corps JSON d'une réponse. Renvoie null s'il est vide ou n'est pas
// du JSON, au lieu de lever une erreur de lecture.
async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
