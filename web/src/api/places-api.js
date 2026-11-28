// Rôle : les appels des lieux et du tableau du direct (F1), un par route
// publique de l'API décrite dans docs/architecture.md. Aucun compte n'est
// demandé. Chaque fonction passe par apiRequest() (ADR-0006).
import { apiRequest } from './api-client.js'

// Les lieux qui ont au moins une radio en direct. Ne reçoit rien ; renvoie
// [{ id, name, countryCode, countryName, timezone, stationCount }].
export async function getPlaces() {
  const { places } = await apiRequest('/places')
  return places
}

// Le tableau du direct d'un lieu. Reçoit l'identifiant tel qu'il est lu dans
// l'adresse de l'écran ; renvoie { place, stations }, où chaque station est
// { id, name, streamUrl, homepageUrl, title } et title vaut null quand le
// titre est indisponible. Lève une ApiError 404 (lieu inconnu) ou 400
// (identifiant mal formé).
export async function getPlaceBoard(placeId) {
  // Sécurité : l'identifiant vient de la barre d'adresse ; encodé, un « / »
  // ou un « ? » ne peut pas changer la route appelée.
  return apiRequest(`/places/${encodeURIComponent(placeId)}/stations`)
}
