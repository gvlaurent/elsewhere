// Rôle : accès à l'annuaire externe Radio Browser (ELS-6), côté serveur
// seulement. Le navigateur ne lui parle jamais (C11) : l'API recopie les
// stations dans sa base, puis les sert depuis là.
//
// Ce module fait partie de la couche d'accès aux données, mais pour une
// source extérieure : il sait parler HTTP à Radio Browser et ramène des
// données brutes, sans décider lesquelles garder. Le tri (HTTPS, hors ligne,
// doublons, lieu) est une règle métier : il vit dans le service
// stations-import-service.js. Choix expliqués dans l'ADR-0005.
//
// Règles d'usage de Radio Browser respectées ici (docs/els-6-annuaire-stations.md) :
// - aucun serveur codé en dur : la liste vient du DNS, elle est mélangée,
//   et on passe au serveur suivant en cas d'échec ;
// - un User-Agent qui nomme l'application, sans aucune donnée personnelle ;
// - les stations sont identifiées par stationuuid et cherchées par code pays.
import { resolveSrv } from 'node:dns/promises';
import { z } from '../config/zod.js';

// Nom envoyé à Radio Browser à chaque requête. Générique : ni nom de
// personne, ni adresse e-mail.
export const USER_AGENT = 'Elsewhere/0.1';

// Délai maximal d'une requête, en millisecondes. Au-delà, on abandonne ce
// serveur et on passe au suivant.
const DEFAULT_TIMEOUT_MS = 10_000;

// Erreur levée quand aucun serveur de l'annuaire n'a répondu correctement.
// Le service la laisse remonter : rien n'est écrit en base, le cache garde
// ses stations d'avant.
export class RadioBrowserUnavailableError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause });
    this.name = 'RadioBrowserUnavailableError';
  }
}

// Forme d'une station telle qu'on la garde. Les champs inconnus sont
// retirés (Zod ne garde que ceux décrits ici). Un champ absent ou du mauvais
// type devient une valeur vide (.catch) : la station sera alors écartée par
// le service, au lieu de faire échouer toute l'importation.
const stationSchema = z
  .object({
    stationuuid: z.string().catch(''),
    name: z.string().catch(''),
    url: z.string().catch(''),
    url_resolved: z.string().catch(''),
    homepage: z.string().catch(''),
    countrycode: z.string().catch(''),
    state: z.string().catch(''),
    lastcheckok: z.number().catch(0),
    votes: z.number().catch(0),
  })
  // Un élément qui n'est même pas un objet devient une station vide.
  .catch(() => stationSchema.parse({}));

// La réponse entière doit être une liste ; sinon, ce serveur est jugé en panne.
const responseSchema = z.array(z.unknown());

// Trouve les serveurs de Radio Browser par le DNS, comme le demande sa
// documentation. Ne reçoit rien ; renvoie une liste de noms de serveurs
// (ex. de1.api.radio-browser.info). Asynchrone : interroge le réseau.
async function resolveServersFromDns() {
  const records = await resolveSrv('_api._tcp.radio-browser.info');
  return records.map((record) => record.name);
}

// Mélange une liste (algorithme de Fisher-Yates) sans modifier l'originale,
// pour répartir la charge entre les serveurs. Reçoit une liste, renvoie une
// nouvelle liste dans un ordre aléatoire.
function shuffleServers(servers) {
  const result = [...servers];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Fabrique un client de Radio Browser. Tout ce qui touche au réseau peut
// être remplacé, ce qui permet aux tests de simuler l'annuaire :
// - fetchImpl : la fonction fetch (par défaut, le fetch natif de Node 24) ;
// - resolveServers : la recherche des serveurs (par défaut, le DNS) ;
// - shuffle : le mélange des serveurs ;
// - timeoutMs : le délai maximal de chaque requête.
// Renvoie un objet { searchStationsByCountry }.
export function createRadioBrowserClient({
  fetchImpl = fetch,
  resolveServers = resolveServersFromDns,
  shuffle = shuffleServers,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  // Interroge un chemin de l'API sur chaque serveur, jusqu'au premier qui
  // répond correctement. Reçoit le chemin (ex. /json/stations/…). Renvoie
  // le JSON reçu. Lève RadioBrowserUnavailableError si tous échouent.
  async function getJson(path) {
    let servers;
    try {
      servers = shuffle(await resolveServers());
    } catch (error) {
      throw new RadioBrowserUnavailableError('Serveurs de Radio Browser introuvables (DNS)', {
        cause: error,
      });
    }

    const failures = [];
    for (const server of servers) {
      try {
        const response = await fetchImpl(`https://${server}${path}`, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
          // Asynchrone : AbortSignal.timeout annule la requête si le
          // serveur n'a pas répondu à temps. fetch rejette alors sa
          // promesse, et on passe au serveur suivant.
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // response.json() lit le corps : il est couvert par le même délai.
        const body = responseSchema.parse(await response.json());
        return body;
      } catch (error) {
        failures.push(`${server} : ${error.message}`);
      }
    }
    throw new RadioBrowserUnavailableError(
      `Radio Browser injoignable (${failures.join(' ; ') || 'aucun serveur'})`,
    );
  }

  // Ramène toutes les stations d'un pays, sans les trier.
  // Reçoit un code pays ISO à deux lettres (NG). Renvoie une liste de
  // stations réduites aux champs utiles (voir stationSchema).
  async function searchStationsByCountry(countryCode) {
    // Sécurité : le code est collé dans l'adresse ; on n'accepte que deux
    // lettres, pour qu'il ne puisse pas changer le chemin demandé.
    if (!/^[A-Za-z]{2}$/.test(countryCode)) {
      throw new TypeError(`Code pays invalide : ${countryCode}`);
    }
    // hidebroken n'est pas demandé : le service écarte lui-même les
    // stations hors ligne, et peut ainsi les compter.
    const stations = await getJson(
      `/json/stations/bycountrycodeexact/${countryCode.toUpperCase()}`,
    );
    return stations.map((station) => stationSchema.parse(station));
  }

  return { searchStationsByCountry };
}
