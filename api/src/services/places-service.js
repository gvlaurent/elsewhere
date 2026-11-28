// Rôle : service des lieux et du tableau du direct (F1, ELS-23). Porte la
// règle métier de ces écrans : une station n'affiche son titre que s'il a
// été lu il y a moins de 5 minutes (freshTitle), sinon null, que
// l'interface écrit « titre indisponible ». Il ne connaît pas HTTP : il lève
// une HttpError 404 pour un lieu inconnu, que la gestion d'erreurs centrale
// traduit en réponse.
//
// Chaque fonction reçoit en dernier { repositories } : les vraies fonctions
// d'accès aux données par défaut, des fonctions simulées dans les tests, qui
// vérifient ainsi la règle sans base.
import { HttpError } from '../errors/http-error.js';
import { freshTitle } from './fresh-title.js';
import { findPlaceById, findPlacesWithActiveStations } from '../repositories/places-repository.js';
import { findActiveStationsByPlace } from '../repositories/stations-repository.js';

const DEFAULT_REPOSITORIES = { findPlacesWithActiveStations, findPlaceById, findActiveStationsByPlace };

// Liste les lieux à montrer : ceux qui ont au moins une station active.
// Reçoit db et, en option, { repositories }. Renvoie [{ id, name,
// countryCode, countryName, timezone, stationCount }], triés par nom.
// L'heure locale n'est pas calculée ici : le navigateur la calcule avec le
// fuseau, et la tient à jour chaque minute (ADR-0007).
export async function listPlaces(db, { repositories = DEFAULT_REPOSITORIES } = {}) {
  return repositories.findPlacesWithActiveStations(db);
}

// Prépare le tableau du direct d'un lieu. Reçoit db, l'identifiant du lieu
// (entier déjà validé) et, en option, { repositories, now } : now est
// l'instant présent, fixé par les tests. Renvoie { place, stations }, où
// chaque station est { id, name, streamUrl, homepageUrl, title } et title
// vaut null quand le titre est indisponible. Lève une HttpError 404 si le
// lieu n'existe pas.
export async function getPlaceBoard(db, placeId, { repositories = DEFAULT_REPOSITORIES, now = new Date() } = {}) {
  const place = await repositories.findPlaceById(db, placeId);
  if (!place) throw new HttpError(404, 'Lieu introuvable');

  const rows = await repositories.findActiveStationsByPlace(db, placeId);
  // Jamais de faux titre : le titre brut et son heure de lecture ne
  // sortent pas du service, seul le résultat de freshTitle part au client.
  const stations = rows.map(({ id, name, streamUrl, homepageUrl, lastTitle, lastTitleReadAt }) => ({
    id,
    name,
    streamUrl,
    homepageUrl,
    title: freshTitle(lastTitle, lastTitleReadAt, now),
  }));
  return { place, stations };
}
