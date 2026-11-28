// Rôle : couche « services » des moments (F5, F6). Porte les règles :
// - ce qui est gardé est calculé ici, jamais envoyé par le navigateur : les
//   copies (station, lieu, pays, thème), le titre (seulement s'il est
//   récent, voir fresh-title.js) et l'instant (l'heure locale en découle) ;
// - une station masquée par un admin ne peut pas être gardée ;
// - les droits : un membre ne touche qu'à ses propres moments. Un moment
//   absent et le moment d'un autre membre reçoivent le même 404 (ADR-0009).
// Ne connaît pas HTTP : il reçoit l'identifiant du membre (que le
// contrôleur lit dans req.user) et lance des HttpError que la gestion
// d'erreurs centrale traduit en réponse.
//
// Chaque fonction reçoit en premier « db », le pool, et en dernier un
// objet facultatif { repositories, now } : l'application utilise les vrais
// repositories et l'heure réelle, un test passe des faux pour vérifier les
// règles sans base.
import { HttpError } from '../errors/http-error.js';
import { freshTitle } from './fresh-title.js';
import { findStationWithPlace } from '../repositories/stations-repository.js';
import { findThemeById } from '../repositories/themes-repository.js';
import {
  createMoment,
  deleteMomentOfUser,
  listMomentsOfUser,
} from '../repositories/moments-repository.js';

const defaultRepositories = {
  findStationWithPlace,
  findThemeById,
  createMoment,
  listMomentsOfUser,
  deleteMomentOfUser,
};

// Garde un moment pour un membre (F5). Reçoit db, l'identifiant du membre
// et { stationId, themeId } déjà validés (themeId peut manquer : l'auditeur
// est entré par un lieu). Renvoie le moment créé. Lève une HttpError 404 si
// la station n'existe pas ou est masquée, ou si le thème n'existe pas.
export async function keepMoment(
  db,
  userId,
  { stationId, themeId = null },
  { repositories = defaultRepositories, now = new Date() } = {},
) {
  const station = await repositories.findStationWithPlace(db, stationId);
  // Une station masquée reçoit le même 404 qu'une station inconnue : pour
  // l'auditeur, elle n'est plus proposée, donc elle n'existe plus.
  if (!station || station.status === 'hidden') {
    throw new HttpError(404, 'Station introuvable');
  }

  let theme = null;
  if (themeId !== null) {
    theme = await repositories.findThemeById(db, themeId);
    if (!theme) throw new HttpError(404, 'Thème introuvable');
  }

  return repositories.createMoment(db, {
    userId,
    stationId: station.id,
    themeId: theme?.id ?? null,
    stationName: station.name,
    placeName: station.placeName,
    countryCode: station.countryCode,
    countryName: station.countryName,
    themeName: theme?.name ?? null,
    // Jamais de faux titre : le titre n'est gardé que s'il a été lu il y a
    // moins de 5 minutes, sinon null (« titre indisponible »).
    trackTitle: freshTitle(station.lastTitle, station.lastTitleReadAt, now),
    // Le même instant sert au titre, à kept_at et à l'heure locale : le
    // moment est cohérent avec lui-même.
    keptAt: now,
    timezone: station.timezone,
  });
}

// Liste les moments du membre connecté, du plus récent au plus ancien
// (F6). Reçoit db et l'identifiant du membre. Renvoie un tableau.
export async function listMoments(db, userId, { repositories = defaultRepositories } = {}) {
  return repositories.listMomentsOfUser(db, userId);
}

// Supprime un moment du membre connecté. Reçoit db, l'identifiant du
// membre et celui du moment. Ne renvoie rien. Lève une HttpError 404 si le
// moment n'existe pas ou appartient à un autre membre : répondre 403 dans
// le second cas révélerait qu'un moment porte ce numéro (ADR-0009).
export async function deleteMoment(db, userId, momentId, { repositories = defaultRepositories } = {}) {
  const deleted = await repositories.deleteMomentOfUser(db, { userId, momentId });
  if (!deleted) throw new HttpError(404, 'Moment introuvable');
}
