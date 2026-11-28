// Rôle : service d'importation des stations (ELS-22). Il recopie dans la base
// d'Elsewhere les stations de Radio Browser pour une liste de lieux, pour
// que l'API les serve ensuite depuis son cache : le navigateur ne parle
// jamais à l'annuaire (C11).
//
// Il enchaîne les trois couches sans en mélanger les rôles :
// 1. le client Radio Browser ramène les stations brutes de chaque pays ;
// 2. station-selection.js applique les règles métier (HTTPS seulement,
//    hors ligne et doublons écartés, rattachement au lieu) ;
// 3. les repositories places et stations écrivent en base, en SQL paramétré.
// Il ne connaît pas HTTP : la commande npm run stations:import l'appelle
// aujourd'hui, la tâche de chaque nuit (ELS-37) l'appellera demain.
import { selectStations } from './station-selection.js';
import { upsertPlace } from '../repositories/places-repository.js';
import { upsertStations } from '../repositories/stations-repository.js';
import { withTransaction } from '../db/transaction.js';

// Importe les stations des lieux donnés.
// Reçoit db, qui doit être le pool et non un client de transaction : le
// service ouvre lui-même sa transaction (withTransaction emprunte une
// connexion au pool). Reçoit aussi { client, places } : un client Radio
// Browser (voir clients/radio-browser-client.js, ou un faux client dans les
// tests) et la liste des lieux (voir config/starting-places.js).
// Renvoie un rapport { places, countries } :
// - places : pour chaque lieu, { name, countryCode, kept, inserted, updated,
//   unchanged, discarded }, où discarded a une clé par raison de
//   DISCARD_REASONS (station-selection.js) ;
// - countries : pour chaque pays, { countryCode, received, unknownPlace, invalid }.
// Lève RadioBrowserUnavailableError si l'annuaire ne répond pas : dans ce
// cas rien n'est écrit, et le cache garde ses stations d'avant.
export async function importStations(db, { client, places }) {
  // Étape 1 : tout lire avant d'écrire quoi que ce soit. Un pays n'est
  // demandé qu'une fois, même s'il a plusieurs lieux. Asynchrone et dans
  // l'ordre (un pays après l'autre) : on reste léger pour l'annuaire, qui
  // est un service communautaire.
  const stationsByCountry = {};
  for (const place of places) {
    if (!(place.countryCode in stationsByCountry)) {
      stationsByCountry[place.countryCode] = await client.searchStationsByCountry(place.countryCode);
    }
  }

  // Étape 2 : les règles métier, sans réseau ni base.
  const selection = selectStations(stationsByCountry, places);

  // Étape 3 : écrire en une seule transaction. Si une écriture échoue, la
  // base revient à l'état d'avant l'importation.
  const placeReports = await withTransaction(db, async (transaction) => {
    const reports = [];
    for (const { place, kept, discarded } of selection.places) {
      const saved = await upsertPlace(transaction, place);
      const { inserted, updated } = await upsertStations(transaction, saved.id, kept);
      reports.push({
        name: place.name,
        countryCode: place.countryCode,
        kept: kept.length,
        inserted,
        updated,
        unchanged: kept.length - inserted - updated,
        discarded,
      });
    }
    return reports;
  });

  return { places: placeReports, countries: selection.countries };
}
