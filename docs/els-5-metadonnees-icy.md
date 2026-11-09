# ELS-5 — Les radios diffusent-elles l'artiste et le titre ?

Test du 9 novembre 2026. Décision : **afficher le titre seulement quand le flux le donne, rien sinon** (option 1 ci-dessous).

## Pourquoi ce test

La règle produit « jamais de faux titre » interdit d'inventer un titre. Avant de construire le lecteur et l'historique, il fallait savoir quelle part des radios envoie réellement l'artiste et le titre en cours.

## Méthode

- **Source des titres testée :** les métadonnées ICY, un texte `StreamTitle='…'` que le serveur glisse dans le flux audio à intervalle régulier.
- **Échantillon :** 20 stations prises sur radio-browser.info, la mieux notée par pays (et par genre quand c'est possible), flux HTTPS uniquement. 5 continents, 7 radios de parole.
- **Écoute :** jusqu'au premier titre non vide, ou 45 secondes au maximum.
- **Classement du texte :** « vide » (rien, ou seulement des tirets), « texte libre » (nom de la station ou texte sans séparateur), « artiste – titre » (au moins deux parties séparées par ` - ` ou ` / `).
- **Script :** `scripts/test-icy-metadata.js`, relançable avec `node scripts/test-icy-metadata.js` (ou `… 1,6,7` pour ne retester que certaines stations).

## Résultats

| # | Station | Pays | Continent | Type | Format | ICY | Texte reçu | Catégorie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | RMC Info Talk Sport | FR | Europe | parole | MP3 | oui | | vide |
| 2 | SWR3 | DE | Europe | musique | MP3 | oui | Tonight / Reamonn | artiste – titre |
| 3 | News Radio UK | GB | Europe | parole | AAC | oui | | vide |
| 4 | LOS40 Classic | ES | Europe | musique | MP3 | oui | Yazoo - Don't go | artiste – titre |
| 5 | NEU RADIO | IT | Europe | musique | MP3 | oui | - Sonny & The Sunsets - Pretend You Love Me | artiste – titre |
| 6 | RTS 92.5 RSI | SN | Afrique | musique | AAC | oui | | vide |
| 7 | METRO FM LAGOS | NG | Afrique | musique | MP3 | oui | | vide |
| 8 | Kaya FM | ZA | Afrique | parole | AAC | oui | | vide |
| 9 | MA:-Hit Radio Maroc | MA | Afrique | musique | MP3 | oui | | vide |
| 10 | Fox News Radio | US | Amérique | parole | AAC+ | oui | | vide |
| 11 | BH FM 102,1 | BR | Amérique | musique | AAC+ | oui | | vide |
| 12 | El Fonógrafo | MX | Amérique | musique | MP3 | oui | OV7 - Mirame A Los Ojos | artiste – titre |
| 13 | CBC Radio 1 Calgary | CA | Amérique | parole | AAC (HLS) | non testable | | — |
| 14 | La 2x4 | AR | Amérique | musique | AAC+ | oui | | vide |
| 15 | Gensokyo Radio | JP | Asie | musique | MP3 | oui | Stack - ENDLESS FANTASY [リマスタリング] | artiste – titre |
| 16 | Bollywood Gaane Purane | IN | Asie | musique | MP3 | oui | Superhit Old Classic Songs of Lata Mangeshkar - Jukebox 4 | **faux positif** (nom de playlist) |
| 17 | 안동MBC FM4U | KR | Asie | musique | AAC (HLS) | non testable | | — |
| 18 | CNN Indonesia | ID | Asie | parole | HLS | non testable | | — |
| 19 | Sky News Australia Radio | AU | Océanie | parole | AAC+ | oui | | vide |
| 20 | Radio Chinese FM90.6 | NZ | Océanie | musique | MP3 | oui | 周传雄 - 青花 | artiste – titre |

Corrections manuelles par rapport à la sortie du script : le type de CBC Radio 1 et de CNN Indonesia (parole, et non musique), et la ligne 16, classée « artiste – titre » par la règle automatique alors qu'il s'agit d'un nom de playlist.

| | Musique (13) | Parole (7) | Total |
| --- | --- | --- | --- |
| Vrai titre | 6 | 0 | **6 (30 %)** |
| Faux positif | 1 | 0 | 1 |
| Vide après 45 s | 5 | 5 | 10 |
| HLS, non testable | 1 | 2 | 3 |

## Ce qu'on en retient

- **La parole n'envoie jamais de titre**, ce qui est logique : il n'y a pas de morceau.
- **Pour la musique, c'est environ une station sur deux.** Les stations sans titre sont surtout en Afrique et en Amérique du Sud, c'est-à-dire une partie de ce qu'Elsewhere veut faire découvrir.
- **Une règle automatique laisse passer des faux titres** (ligne 16). La classification devra être prudente et testée.

## Limites du test

- **Échantillon favorable :** ce sont les stations les mieux notées, souvent bien équipées. Sur des stations prises au hasard, le taux serait probablement plus bas.
- **45 secondes d'écoute :** un serveur qui n'enverrait le titre qu'au changement de morceau peut avoir été manqué. Sur les stations testées, les blocs de métadonnées arrivaient bien mais restaient vides (14 blocs vides en 45 s pour Metro FM Lagos).
- **HLS non couvert :** les flux HLS transportent leurs métadonnées autrement. 3 stations n'ont pas pu être testées.
- **Un seul passage :** le résultat d'une station peut varier selon l'heure (une émission parlée sur une radio musicale, par exemple).

## Décision

Trois options étaient possibles :

1. **Titre quand il existe, rien sinon** — retenue.
2. Plan B complet : jamais de titre dans le MVP.
3. Autres sources (API « now playing » propres à chaque radio, reconnaissance audio) : trop coûteux d'ici le gel du 6 décembre, et la reconnaissance audio produirait des faux titres sur la musique locale.

**Conséquences :**

- Le lecteur affiche le titre uniquement s'il est classé « artiste – titre ». Sinon, il montre la station, le pays et l'heure locale, sans aucun texte de remplacement.
- L'historique repose sur les **stations écoutées** (moments, passeport), et non sur les titres.
- La classification devient une règle de l'application, avec des tests, dans le service stations (ELS-22).

**Piste après le MVP :** enrichir un titre reçu (pochette, lien vers un service de streaming) grâce à une API de catalogue. Ces API ne connaissent pas ce que joue une radio : elles ne peuvent qu'enrichir un titre déjà obtenu.
