// Rôle : commande qui remplit le cache des stations (ELS-22), lancée à la
// main depuis api/ :
//
//   npm run stations:import
//
// Elle importe les stations des lieux de départ (config/starting-places.js)
// depuis Radio Browser, puis affiche ce qu'elle a gardé et écarté, avec la
// raison. Elle ne contient aucune règle : elle branche le vrai client de
// l'annuaire et le vrai pool de la base sur le service d'importation, puis
// met son rapport en forme. La tâche de chaque nuit (ELS-37) appellera le
// même service.
import { createPool } from '../db/pool.js';
import { createRadioBrowserClient } from '../clients/radio-browser-client.js';
import { importStations } from '../services/stations-import-service.js';
import { STARTING_PLACES } from '../config/starting-places.js';
import { DISCARD_REASONS } from '../services/station-selection.js';

// Met en forme le rapport du service pour le terminal.
// Reçoit le rapport { places, countries } de importStations.
// Renvoie un texte de plusieurs lignes : une par lieu, une par pays, puis
// les totaux.
export function formatImportReport({ places, countries }) {
  const lines = ['Stations par lieu :'];
  let totalKept = 0;
  let totalDiscarded = 0;

  for (const place of places) {
    const discarded = Object.values(place.discarded).reduce((sum, n) => sum + n, 0);
    totalKept += place.kept;
    totalDiscarded += discarded;
    const reasons = Object.entries(DISCARD_REASONS).map(([key, label]) => `${label} : ${place.discarded[key]}`).join(', ');
    lines.push(
      `- ${place.name} (${place.countryCode}) : ${place.kept} gardées ` +
        `(${place.inserted} nouvelles, ${place.updated} mises à jour, ${place.unchanged} inchangées), ` +
        `${discarded} écartées (${reasons})`,
    );
  }

  lines.push('', 'Stations sans lieu, par pays :');
  for (const country of countries) {
    totalDiscarded += country.unknownPlace + country.invalid;
    lines.push(
      `- ${country.countryCode} : ${country.received} reçues de Radio Browser, ` +
        `${country.unknownPlace} lieu inconnu, ${country.invalid} invalides`,
    );
  }

  lines.push('', `Total : ${totalKept} stations gardées, ${totalDiscarded} écartées.`);
  return lines.join('\n');
}

// Lancé directement (npm run stations:import) plutôt qu'importé par un
// test : on importe pour de bon, puis on ferme la connexion à la base.
if (import.meta.main) {
  const pool = createPool();
  try {
    const report = await importStations(pool, {
      client: createRadioBrowserClient(),
      places: STARTING_PLACES,
    });
    console.log(formatImportReport(report));
  } catch (error) {
    // Seul le message est affiché : ni pile d'appels, ni adresse de la base.
    console.error('Importation échouée, la base n\'a pas changé :', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
