// Rôle : règles métier du tri des stations venues de Radio Browser (ELS-22).
// Ce module est « pur » : il ne touche ni au réseau ni à la base. Il reçoit
// des stations brutes et dit lesquelles garder, pour quel lieu, et pourquoi
// les autres sont écartées. Le service d'importation (stations-import-service.js)
// s'en sert entre l'appel à l'annuaire et l'écriture en base.
//
// Les règles, dans l'ordre où elles s'appliquent à une station :
// 1. invalide : identifiant (stationuuid) qui n'est pas un UUID, ou nom vide ;
// 2. lieu inconnu : ni sa région (« state »), ni, si la région est vide,
//    son nom ne contient l'alias d'un lieu de son pays (voir matchesPlace).
//    Ce compte se fait par pays, puisque la station n'a pas de lieu ;
// 3. hors ligne : le dernier test de Radio Browser a échoué (lastcheckok = 0) ;
// 4. pas en HTTPS : la page d'Elsewhere est en HTTPS, et un navigateur y
//    bloque un flux en http:// (contenu mixte). Une station illisible ne
//    doit pas entrer dans le cache ;
// 5. doublon : même identifiant, même flux, ou même nom dans le même lieu
//    qu'une station déjà gardée. On garde la plus votée.
// Le rattachement passe avant les autres règles : ainsi, chaque raison
// d'écart (sauf « invalide » et « lieu inconnu ») est comptée pour un lieu
// précis, ce qui rend le rapport lisible lieu par lieu.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Met un texte sous une forme comparable : sans accents, en minuscules,
// sans espaces autour. Reçoit un texte, renvoie le texte normalisé.
// Ex. « Bogotá » et « BOGOTA » donnent tous deux « bogota ».
export function normalizeText(text) {
  return text
    .normalize('NFD') // sépare chaque lettre de son accent (á → a + ´)
    .replace(/\p{M}/gu, '') // retire les accents ainsi séparés
    .toLowerCase()
    .trim();
}

// Dit si une station brute appartient à un lieu. Règle décidée par Gabriel
// le 28/11/2026, la même pour tous les lieux : « la région d'abord, sinon
// le nom », toujours dans le pays du lieu.
// 1. Le champ « state » est rempli : il doit contenir l'un des alias.
// 2. Le champ « state » est vide : c'est le nom de la station qui doit
//    contenir l'un des alias (ex. « Radio Dakar FM » pour Dakar, dont
//    aucune station n'a de « state » dans Radio Browser).
// Un « state » rempli qui ne correspond pas reste un refus : on ne se
// rabat pas sur le nom, la région renseignée fait foi.
// Comparaisons sans majuscules ni accents, sous forme de « contient ».
// Reçoit la station ({ countrycode, state, name }) et le lieu
// ({ countryCode, stateAliases }). Renvoie true ou false.
export function matchesPlace(station, place) {
  if (station.countrycode.toUpperCase() !== place.countryCode) return false;
  const state = normalizeText(station.state);
  const searched = state || normalizeText(station.name);
  if (!searched) return false;
  return place.stateAliases.some((alias) => searched.includes(normalizeText(alias)));
}

// Lit une adresse web et la renvoie seulement si elle est en http ou https.
// Reçoit un texte ; renvoie un objet URL, ou null pour toute autre chose
// (texte vide, « javascript: », adresse mal formée).
function parseWebUrl(text) {
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

// Clé qui reconnaît deux fois le même flux malgré de petites différences
// d'écriture (majuscules du nom de domaine, barre oblique finale).
function streamKey(url) {
  return `${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, '')}${url.search}`;
}

// Trie les stations brutes de plusieurs pays et les répartit entre les lieux.
// Reçoit :
// - stationsByCountry : { NG: [stations brutes], GH: [...] }, une liste par
//   code pays, telle que la renvoie le client Radio Browser ;
// - places : les lieux ({ name, countryCode, stateAliases, … }).
// Renvoie {
//   places : pour chaque lieu, dans le même ordre, { place, kept, discarded },
//     où kept est la liste des stations à enregistrer, au format de la base
//     ({ externalId, name, streamUrl, homepageUrl }), et discarded le nombre
//     de stations écartées par raison ({ offline, not_https, duplicate }) ;
//   countries : pour chaque pays, { countryCode, received, unknownPlace, invalid } }.
export function selectStations(stationsByCountry, places) {
  const placeResults = places.map((place) => ({
    place,
    kept: [],
    discarded: { offline: 0, not_https: 0, duplicate: 0 },
    candidates: [],
  }));
  const countries = [];

  // Étape 1 : chaque station valide est rattachée à son lieu, ou comptée
  // « lieu inconnu » pour son pays.
  for (const [countryCode, stations] of Object.entries(stationsByCountry)) {
    const country = { countryCode, received: stations.length, unknownPlace: 0, invalid: 0 };
    countries.push(country);

    for (const station of stations) {
      if (!UUID_PATTERN.test(station.stationuuid) || !station.name.trim()) {
        country.invalid += 1;
        continue;
      }
      const target = placeResults.find((result) => matchesPlace(station, result.place));
      if (!target) {
        country.unknownPlace += 1;
        continue;
      }
      target.candidates.push(station);
    }
  }

  // Étape 2 : règles de qualité, lieu par lieu. Les ensembles « déjà vus »
  // sont communs à tous les lieux : une même station ne peut jamais être
  // gardée deux fois, même pour deux lieux différents.
  const seenIds = new Set();
  const seenStreams = new Set();

  for (const result of placeResults) {
    const seenNames = new Set(); // un même nom n'est un doublon que dans un même lieu
    // Les plus votées d'abord : en cas de doublon, c'est elle qu'on garde.
    // [...] copie la liste, pour ne pas modifier celle reçue.
    const ordered = [...result.candidates].sort((a, b) => b.votes - a.votes);

    for (const station of ordered) {
      if (station.lastcheckok !== 1) {
        result.discarded.offline += 1;
        continue;
      }
      const stream = parseWebUrl(station.url_resolved || station.url);
      if (stream?.protocol !== 'https:') {
        result.discarded.not_https += 1;
        continue;
      }
      const id = station.stationuuid.toLowerCase();
      const name = station.name.trim();
      const key = streamKey(stream);
      const nameKey = normalizeText(name);
      if (seenIds.has(id) || seenStreams.has(key) || seenNames.has(nameKey)) {
        result.discarded.duplicate += 1;
        continue;
      }
      seenIds.add(id);
      seenStreams.add(key);
      seenNames.add(nameKey);

      result.kept.push({
        externalId: id,
        name,
        streamUrl: stream.href,
        homepageUrl: parseWebUrl(station.homepage)?.href ?? null,
      });
    }
  }

  return {
    // On retire la liste de travail « candidates » du résultat.
    places: placeResults.map(({ place, kept, discarded }) => ({ place, kept, discarded })),
    countries,
  };
}
