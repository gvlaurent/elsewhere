// Script d'enquête ponctuelle (ELS-5), hors de l'application : vérifie si des radios
// variées envoient l'artiste et le titre en cours dans leur flux (métadonnées ICY).
// Il choisit les stations sur radio-browser.info, lit le premier titre reçu de chaque
// flux, puis affiche un tableau Markdown. Lancement : node scripts/test-icy-metadata.js
// Pour ne retester que certaines stations : node scripts/test-icy-metadata.js 1,6,7

const http = require("node:http");
const https = require("node:https");

const API_URL = "https://de1.api.radio-browser.info/json/stations/search";
const USER_AGENT = "Elsewhere-spike/0.1";
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
// Beaucoup de serveurs n'envoient le titre qu'au changement de morceau :
// il faut écouter assez longtemps pour ne pas conclure « vide » à tort.
const LISTEN_MS = 45000;
const ONLY = process.argv[2]?.split(",").map(Number) ?? null;

// Échantillon voulu : au moins 5 continents, au moins 4 radios de parole.
const SAMPLE = [
  { continent: "Europe", countrycode: "FR", tag: "news", type: "parole" },
  { continent: "Europe", countrycode: "DE", tag: "pop", type: "musique" },
  { continent: "Europe", countrycode: "GB", tag: "talk", type: "parole" },
  { continent: "Europe", countrycode: "ES", tag: "rock", type: "musique" },
  { continent: "Europe", countrycode: "IT", tag: "jazz", type: "musique" },
  { continent: "Afrique", countrycode: "SN", tag: null, type: "musique" },
  { continent: "Afrique", countrycode: "NG", tag: null, type: "musique" },
  { continent: "Afrique", countrycode: "ZA", tag: "talk", type: "parole" },
  { continent: "Afrique", countrycode: "MA", tag: null, type: "musique" },
  { continent: "Amérique", countrycode: "US", tag: "news", type: "parole" },
  { continent: "Amérique", countrycode: "BR", tag: "samba", type: "musique" },
  { continent: "Amérique", countrycode: "MX", tag: null, type: "musique" },
  { continent: "Amérique", countrycode: "CA", tag: "classical", type: "musique" },
  { continent: "Amérique", countrycode: "AR", tag: "tango", type: "musique" },
  { continent: "Asie", countrycode: "JP", tag: null, type: "musique" },
  { continent: "Asie", countrycode: "IN", tag: null, type: "musique" },
  { continent: "Asie", countrycode: "KR", tag: "k-pop", type: "musique" },
  { continent: "Asie", countrycode: "ID", tag: null, type: "musique" },
  { continent: "Océanie", countrycode: "AU", tag: "news", type: "parole" },
  { continent: "Océanie", countrycode: "NZ", tag: null, type: "musique" },
];

// Cherche la station la mieux notée d'un pays (et d'un genre si possible) dont le flux
// est en HTTPS et marqué comme fonctionnel. Sans résultat pour le genre, on relâche ce filtre.
async function findStation({ countrycode, tag }) {
  const params = new URLSearchParams({
    countrycode,
    is_https: "true",
    hidebroken: "true",
    order: "votes",
    reverse: "true",
    limit: "1",
  });
  if (tag) params.set("tag", tag);

  const response = await fetch(`${API_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  const stations = await response.json();
  if (stations.length === 0 && tag) return findStation({ countrycode, tag: null });
  return stations[0] ?? null;
}

// Ouvre le flux en demandant les métadonnées ICY et suit les redirections.
// On passe par node:http plutôt que fetch : certains serveurs répondent « ICY 200 OK »,
// une ligne d'état que fetch refuse mais que le module http de Node accepte.
function openStream(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, {
      headers: { "Icy-MetaData": "1", "User-Agent": USER_AGENT },
      timeout: TIMEOUT_MS,
    });

    request.on("response", (response) => {
      const location = response.headers.location;
      if (response.statusCode >= 300 && response.statusCode < 400 && location) {
        response.destroy();
        if (redirectsLeft === 0) return reject(new Error("trop de redirections"));
        return resolve(openStream(new URL(location, url).href, redirectsLeft - 1));
      }
      resolve(response);
    });
    request.on("timeout", () => request.destroy(new Error("délai dépassé")));
    request.on("error", reject);
  });
}

// Retire espaces et tirets aux deux bouts : « - » ou «   » deviennent une chaîne vide.
function clean(text) {
  return text.replace(/^[\s-]+|[\s-]+$/g, "");
}

// Lit le flux jusqu'au premier bloc de métadonnées non vide, ou jusqu'à LISTEN_MS.
// Format ICY : tous les `metaint` octets d'audio, 1 octet donne la longueur du bloc
// (multipliée par 16), puis le bloc lui-même, du texte du type StreamTitle='…';
function readFirstMetadata(response, metaint) {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0);
    // Un minuteur en attente garde Node.js en vie : on l'annule dès qu'on a fini.
    const timer = setTimeout(() => finish(""), LISTEN_MS);

    const finish = (text) => {
      clearTimeout(timer);
      response.destroy();
      resolve(text);
    };

    response.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length > metaint) {
        const length = buffer[metaint] * 16;
        if (buffer.length < metaint + 1 + length) return; // bloc incomplet : attendre la suite
        const block = buffer.subarray(metaint + 1, metaint + 1 + length).toString("utf8");
        buffer = buffer.subarray(metaint + 1 + length);

        const match = block.match(/StreamTitle='(.*?)';/);
        if (match && clean(match[1]) !== "") return finish(match[1].trim());
      }
    });
    response.on("end", () => finish(""));
    response.on("error", () => finish(""));
  });
}

// Range le texte reçu dans une catégorie : « artiste – titre », « texte libre » ou « vide ».
// Règle produit : jamais de faux titre. En cas de doute, ce n'est pas un titre.
function classifyTitle(text, stationName) {
  const cleaned = clean(text);
  if (cleaned === "") return "vide";

  if (cleaned.toLowerCase().includes(stationName.toLowerCase())) return "texte libre";

  // Séparateurs vus dans les flux : « Artiste - Titre » et « Titre / Artiste ».
  const parts = cleaned.split(/ - | \/ /);
  if (parts.length >= 2 && parts.every((part) => part.trim() !== "")) return "artiste – titre";

  return "texte libre";
}

// Teste une station de l'échantillon et renvoie une ligne de résultat.
async function testStation(entry) {
  const station = await findStation(entry);
  if (!station) return { ...entry, name: "(aucune station trouvée)", codec: "", icy: "—", text: "" };

  const base = { ...entry, name: station.name.trim(), codec: station.codec || "?" };
  if (station.hls === 1 || station.url_resolved.includes(".m3u8")) {
    return { ...base, codec: `${base.codec} (HLS)`, icy: "non testable", text: "" };
  }

  try {
    const response = await openStream(station.url_resolved);
    const metaint = Number(response.headers["icy-metaint"]);
    if (!metaint) {
      response.destroy();
      return { ...base, icy: "non", text: "" };
    }
    const text = await readFirstMetadata(response, metaint);
    return { ...base, icy: "oui", text };
  } catch (error) {
    return { ...base, icy: `erreur (${error.message})`, text: "" };
  }
}

// Échappe le texte pour qu'il ne casse pas une cellule de tableau Markdown.
function cell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function main() {
  console.log("| # | Station | Pays | Continent | Type | Format | ICY | Texte reçu | Catégorie |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");

  // Une station après l'autre : plus lent, mais on ne sollicite pas 20 serveurs à la fois.
  for (const [index, entry] of SAMPLE.entries()) {
    if (ONLY && !ONLY.includes(index + 1)) continue;
    const result = await testStation(entry);
    const category = result.icy === "oui" ? classifyTitle(result.text, result.name) : "—";
    console.log(
      `| ${index + 1} | ${cell(result.name)} | ${result.countrycode} | ${result.continent} | ` +
        `${result.type} | ${cell(result.codec)} | ${cell(result.icy)} | ${cell(result.text)} | ${category} |`,
    );
  }
}

main();
