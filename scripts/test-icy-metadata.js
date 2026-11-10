// Script d'enquête ponctuelle (ELS-5), hors de l'application : vérifie si des radios
// musicales envoient l'artiste et le titre en cours dans leur flux (métadonnées ICY).
// Il tire au hasard une radio musicale par pays sur radio-browser.info, écoute chaque flux
// jusqu'au premier titre reçu (3 min au plus), puis affiche un tableau Markdown.
// Lancement : node scripts/test-icy-metadata.js

const http = require("node:http");
const https = require("node:https");

const API_URL = "https://de1.api.radio-browser.info/json/stations/search";
const USER_AGENT = "Elsewhere-spike/0.1";
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
// Beaucoup de serveurs n'envoient le titre qu'au changement de morceau :
// 3 minutes couvrent au moins une fin de morceau sur la plupart des radios musicales.
// Le retest du 10 novembre a montré que le titre arrive dès la connexion, ou jamais.
const LISTEN_MS = 180000;
// Nombre de stations tirées au hasard par pays, parmi lesquelles on garde la première musicale.
const CANDIDATES_PER_COUNTRY = 50;

// Mêmes pays que le premier test (9 novembre), pour pouvoir comparer.
const SAMPLE = [
  { continent: "Europe", countrycode: "FR" },
  { continent: "Europe", countrycode: "DE" },
  { continent: "Europe", countrycode: "GB" },
  { continent: "Europe", countrycode: "ES" },
  { continent: "Europe", countrycode: "IT" },
  { continent: "Afrique", countrycode: "SN" },
  { continent: "Afrique", countrycode: "NG" },
  { continent: "Afrique", countrycode: "ZA" },
  { continent: "Afrique", countrycode: "MA" },
  { continent: "Amérique", countrycode: "US" },
  { continent: "Amérique", countrycode: "BR" },
  { continent: "Amérique", countrycode: "MX" },
  { continent: "Amérique", countrycode: "CA" },
  { continent: "Amérique", countrycode: "AR" },
  { continent: "Asie", countrycode: "JP" },
  { continent: "Asie", countrycode: "IN" },
  { continent: "Asie", countrycode: "KR" },
  { continent: "Asie", countrycode: "ID" },
  { continent: "Océanie", countrycode: "AU" },
  { continent: "Océanie", countrycode: "NZ" },
];

// Mots qui signalent une radio de parole dans les tags Radio Browser.
// Racines tronquées exprès : la comparaison se fait avec « contient ».
const TALK_TAGS = [
  "news", "talk", "sport", "info", "politic", "debate", "religi",
  "noticia", "hablada", "deporte", "tertulia", "polític",
  "notícia", "esporte", "nachrichten", "actualit",
  "新闻", "新聞", "体育", "समाचार", "खबर",
];

// Décide si une station est une radio musicale, à partir de ses tags Radio Browser
// (une chaîne du type "pop,rock,hits"). Radio Browser n'a pas de champ « musique / parole » :
// cette règle est la nôtre, et c'est elle qui décidera du catalogue d'Elsewhere.
function isMusicStation(station) {
  const tags = station.tags.toLowerCase().split(",").map((tag) => tag.trim()).filter(Boolean);
  if (tags.length === 0) return false;
  const isTalk = tags.some((tag) => TALK_TAGS.some((word) => tag.includes(word)));
  return !isTalk;
}

// Tire des stations au hasard dans un pays (flux HTTPS marqués fonctionnels)
// et renvoie la première que isMusicStation accepte.
async function findStation({ countrycode }) {
  const params = new URLSearchParams({
    countrycode,
    is_https: "true",
    hidebroken: "true",
    order: "random",
    limit: String(CANDIDATES_PER_COUNTRY),
  });

  const response = await fetch(`${API_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  const stations = await response.json();
  return stations.find(isMusicStation) ?? null;
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
      // Le délai de connexion ne doit plus couper l'écoute une fois le flux ouvert.
      request.setTimeout(0);
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
// Renvoie le texte reçu et le délai d'attente, pour savoir si une écoute courte aurait suffi.
// Format ICY : tous les `metaint` octets d'audio, 1 octet donne la longueur du bloc
// (multipliée par 16), puis le bloc lui-même, du texte du type StreamTitle='…';
function readFirstMetadata(response, metaint) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let buffer = Buffer.alloc(0);
    // Un minuteur en attente garde Node.js en vie : on l'annule dès qu'on a fini.
    const timer = setTimeout(() => finish(""), LISTEN_MS);

    const finish = (text) => {
      clearTimeout(timer);
      response.destroy();
      resolve({ text, delayMs: Date.now() - startedAt });
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
  const empty = { tags: "", codec: "", icy: "—", text: "", delayMs: null };
  let station;
  try {
    station = await findStation(entry);
  } catch (error) {
    // Les 20 stations sont testées en parallèle : une panne de l'annuaire pour un pays
    // ne doit faire échouer que sa ligne, pas tout le tirage.
    return { ...entry, ...empty, name: "(annuaire injoignable)", icy: `erreur (${error.message})` };
  }
  if (!station) return { ...entry, ...empty, name: "(aucune radio musicale trouvée)" };

  const base = { ...entry, ...empty, name: station.name.trim(), tags: station.tags, codec: station.codec || "?" };
  if (station.hls === 1 || station.url_resolved.includes(".m3u8")) {
    return { ...base, codec: `${base.codec} (HLS)`, icy: "non testable" };
  }

  try {
    const response = await openStream(station.url_resolved);
    const metaint = Number(response.headers["icy-metaint"]);
    if (!metaint) {
      response.destroy();
      return { ...base, icy: "non" };
    }
    const { text, delayMs } = await readFirstMetadata(response, metaint);
    return { ...base, icy: "oui", text, delayMs };
  } catch (error) {
    return { ...base, icy: `erreur (${error.message})` };
  }
}

// Échappe le texte pour qu'il ne casse pas une cellule de tableau Markdown.
function cell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function main() {
  // Toutes les stations en même temps : chacune est sur son propre serveur, qui ne reçoit
  // donc qu'une connexion, et le test dure 3 minutes au lieu d'une heure.
  const results = await Promise.all(SAMPLE.map(testStation));

  console.log("| # | Station | Pays | Continent | Tags | Format | ICY | Délai | Texte reçu | Catégorie |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [index, result] of results.entries()) {
    const category = result.icy === "oui" ? classifyTitle(result.text, result.name) : "—";
    const delay = result.text ? `${Math.round(result.delayMs / 1000)} s` : "";
    console.log(
      `| ${index + 1} | ${cell(result.name)} | ${result.countrycode} | ${result.continent} | ` +
        `${cell(result.tags)} | ${cell(result.codec)} | ${cell(result.icy)} | ${delay} | ` +
        `${cell(result.text)} | ${category} |`,
    );
  }
}

main();
