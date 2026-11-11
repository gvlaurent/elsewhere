# ELS-5 — Les radios diffusent-elles l'artiste et le titre ?

Test du 9 novembre 2026. Décision : **afficher le titre seulement quand le flux le donne, rien sinon** (option 1 ci-dessous).

Retest du 10 novembre 2026 sur 53 radios musicales tirées au hasard (voir [Retest du 10 novembre](#retest-du-10-novembre--radios-musicales-écoute-de-3-minutes)) : décision confirmée, mais la classification des titres doit être nettement plus stricte.

## Pourquoi ce test

La règle produit « jamais de faux titre » interdit d'inventer un titre. Avant de construire le lecteur et l'historique, il fallait savoir quelle part des radios envoie réellement l'artiste et le titre en cours.

## Méthode

- **Source des titres testée :** les métadonnées ICY, un texte `StreamTitle='…'` que le serveur glisse dans le flux audio à intervalle régulier.
- **Échantillon :** 20 stations prises sur radio-browser.info, la mieux notée par pays (et par genre quand c'est possible), flux HTTPS uniquement. 5 continents, 7 radios de parole.
- **Écoute :** jusqu'au premier titre non vide, ou 45 secondes au maximum.
- **Classement du texte :** « vide » (rien, ou seulement des tirets), « texte libre » (nom de la station ou texte sans séparateur), « artiste – titre » (au moins deux parties séparées par ` - ` ou ` / `).
- **Script :** la version utilisée pour ce test est dans l'historique Git (commit `06ab06f`, `scripts/test-icy-metadata.js`). Le script actuel est celui du retest du 10 novembre.

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

## Retest du 10 novembre : radios musicales, écoute de 3 minutes

### Pourquoi refaire le test

- **Elsewhere ne propose plus que des radios musicales** (décision du 10 novembre, notée au Journal). Les radios de parole n'envoyant jamais de titre, il fallait mesurer le taux sur la musique seule.
- **Lever deux limites du premier test :** l'échantillon favorable (stations les mieux notées) et l'écoute de 45 secondes, peut-être trop courte.

### Méthode

- **Échantillon :** dans chacun des 20 pays du premier test, 50 stations tirées au hasard (`order=random`, flux HTTPS marqués fonctionnels), dont on garde la première jugée musicale. Trois tirages : 60 lignes, **53 stations différentes**.
- **Filtre musique :** Radio Browser n'a pas de champ « musique / parole ». La règle `isMusicStation` écarte les stations sans tag, et celles dont un tag contient un mot de parole (`news`, `talk`, `sport`, `info`, `religi`, `noticia`, `nachrichten`…, en plusieurs langues). Les mots ont été choisis d'après leur fréquence réelle dans les tags : presque tous les tags sont en anglais ou en espagnol, très peu en mandarin ou en hindi.
- **Écoute :** jusqu'au premier titre non vide, ou **3 minutes** au maximum. Les 20 stations d'un tirage sont écoutées en même temps.
- **Classement :** même règle automatique que le 9 novembre, puis relecture à la main de chaque texte.
- **Script :** `node scripts/test-icy-metadata.js`. Chaque lancement tire d'autres stations.

### Résultats

Verdict relu à la main. « Délai » : temps écoulé avant le premier titre.

| Tirage | # | Station | Pays | Texte reçu | Délai | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Nostalgie Michael Jackson | FR | 23087 - 20956 | 0 s | **faux titre** (numéros internes) |
| 1 | 2 | Radio Ankerherz | DE | The Jam - Tales From the Riverbank | 0 s | vrai titre |
| 1 | 3 | ROKit Radio : Adventure Stories | GB | Wild Bill Hickok - Ghost Town Gold | 0 s | **faux titre** (épisode de feuilleton, radio de parole) |
| 1 | 4 | Ibiza - Smooth Jazz | ES | Walter Beasley - Coolness | 0 s | vrai titre |
| 1 | 5 | Radio Company Fitness | IT | Coi Leray - Players | 0 s | vrai titre |
| 1 | 6 | Love FM 107.3 Dakar | SN | Now On Air:Hozier - Too Sweet | 0 s | vrai titre (préfixe à retirer) |
| 1 | 7 | Beat FM Lagos 99.9 | NG | | | non testable (HLS) |
| 1 | 8 | Springbok Radio Revisited | ZA | SPRINGBOK (511) - MONDAY - WEDNESDAY | 0 s | **faux titre** (grille d'archives, radio de parole) |
| 1 | 9 | Yabiladi Azawan Amazigh | MA | Chant Ancien Du Rif - Inach Nigh Lkhir | 0 s | vrai titre |
| 1 | 10 | WYSU 88.5 All Classical | US | | | vide |
| 1 | 11 | Band FM Triângulo 99.9 | BR | | | vide |
| 1 | 12 | 95.1 Amor Es (Ciudad Guzmán) | MX | | | vide |
| 1 | 13 | CHAB 800 Moose Jaw | CA | | | vide |
| 1 | 14 | LT32 Radio Chivilcoy | AR | radio chivilcoy | 0 s | texte libre |
| 1 | 15 | Chiafuru | JP | | | non testable (OGG, sans ICY) |
| 1 | 16 | Radio Garhwani | IN | pal bhar ke liye koi humein 4k song johny mera naam(1970)… | 0 s | texte libre |
| 1 | 17 | Big B Radio - Kpop | KR | A2O SOUL - SUPERSTAR | 0 s | vrai titre |
| 1 | 18 | ACDC | ID | ACDC - Send for the Man | 0 s | vrai titre **raté** (contient le nom de la station) |
| 1 | 19 | Triple R 102.7FM | AU | The Mission with Daniel James and Uncle Charles Pakana | 0 s | texte libre (émission, radio de parole) |
| 1 | 20 | Radiowave NZ | NZ | Ray Pillow - Circle of Friends | 0 s | vrai titre |
| 2 | 1 | MBS Gold | FR | BRYAN FERRY - SLAVE TO LOVE | 20 s | vrai titre |
| 2 | 2 | Ella Radio - Hard Bop | DE | J.R. Monterose - Wee-Jay | 0 s | vrai titre |
| 2 | 3 | Unique session radio | GB | Rapson, Nathan Thomas - Heat | 0 s | vrai titre |
| 2 | 4 | Color Estéreo 103.7 FM | ES | KE GUAY VIDEO 2019 | 0 s | texte libre |
| 2 | 5 | Radio Jazeen Jazz | IT | Xavier Gordon - Adorn | 0 s | vrai titre |
| 2 | 6 | Zig FM 100.3 Kolda | SN | MIX_KOMPA_ZOUK_3___2020…(128k).m4a | 0 s | texte libre (nom de fichier) |
| 2 | 7 | 1Radio Ikwerre | NG | onetv_ng - (Nwa Eze Efunamba) &#8211; God Bless You Papa | 0 s | **faux titre** (compte de mise en ligne à la place de l'artiste) |
| 2 | 8 | Perron FM | ZA | Fleetwood Mac - Tusk | 1 s | vrai titre |
| 2 | 9 | MRC:-Radio plus | MA | Radio Plus - Écouté ou pou tendé | 0 s | **faux titre** (slogan) |
| 2 | 10 | KDKI-LP 103.9 Twin Falls | US | | | vide |
| 2 | 11 | Rádio Profecia Expresso | BR | GOSPEL - SHOW Bloco3 | 0 s | **faux titre** (nom d'émission) |
| 2 | 12 | Best FM - Best Retro Music in English | MX | Europe - Final Countdown | 0 s | vrai titre |
| 2 | 13 | Summit 95.7 (Trail) | CA | | | vide |
| 2 | 14 | FM del Lago 92.1 | AR | | | vide |
| 2 | 15 | Radi.fm 中文古典音乐 | JP | | | non testable (HLS) |
| 2 | 16 | Radio Khushbu | IN | Arabic Deep House 2026 … Oud & Violin Instrumental | 1 s | texte libre (titre de vidéo) |
| 2 | 17 | SBS Love FM | KR | | | non testable (HLS) |
| 2 | 18 | Linkin Park - Радио Maximum | ID | | | vide |
| 2 | 19 | 90.1 NBC FM - Narwee | AU | | | vide |
| 2 | 20 | Kiwi Folk Radio | NZ | The Pipis - Mando Bounce | 0 s | vrai titre |
| 3 | 1 | Music Radio Techno | FR | geister transmission null distanz | 0 s | texte libre |
| 3 | 2 | RadioMV Deutsch Altes Testament | DE | 2 Samuel Kapitel 1 | 0 s | texte libre (lecture biblique, radio de parole) |
| 3 | 4 | Sky.Net -RadioSky.Net HITS | ES | | | vide |
| 3 | 5 | Radio Studio Nord 80 Energia | IT | Dance On The Groove (and Do The Funk)-Love International | 0 s | vrai titre **raté** (tiret sans espaces) |
| 3 | 6 | RTS Tambacounda 92.0 | SN | | | vide |
| 3 | 8 | Ballito 88 FM | ZA | | | non testable (HLS) |
| 3 | 10 | Signal City — HX College | US | | | non testable (sans ICY ; cours, radio de parole) |
| 3 | 11 | Rádio Brasil de Fato | BR | | | vide |
| 3 | 13 | CKRC-FM "Magic 103.5" | CA | | | non testable (HLS) |
| 3 | 14 | Radio Tandil - LU22 | AR | | | vide |
| 3 | 17 | TBS eFM 101.3 | KR | | | non testable (HLS ; généraliste, radio de parole) |
| 3 | 18 | Diozz FM | ID | | | non testable (connexion refusée) |
| 3 | 19 | MIBL Radio | AU | Sandee Hawk - Ain't Too Late to Start Again | 0 s | vrai titre |

Les lignes 3, 7, 9, 12, 15, 16 et 20 du tirage 3 sont les mêmes stations qu'au tirage 2 : elles ne sont pas répétées.

| Verdict | Tirage 1 | Tirage 2 | Tirage 3 | **Total (53)** |
| --- | --- | --- | --- | --- |
| Vrai titre, bien classé | 7 | 7 | 1 | **15** |
| Vrai titre, raté par la règle | 1 | 0 | 1 | 2 |
| Faux titre, classé « artiste – titre » | 3 | 3 | 0 | **6** |
| Texte libre | 3 | 3 | 2 | 8 |
| Vide après 3 min | 4 | 5 | 4 | 13 |
| Non testable | 2 | 2 | 5 | 9 |

### Ce qu'on en retient

- **Environ un tiers des radios musicales donne un vrai titre :** 15 sur les 44 stations testables (34 %), 15 sur 53 en tout (28 %). C'est moins que le premier test (6 sur 12 radios musicales, les mieux notées), ce qui confirme que son échantillon était favorable.
- **3 minutes n'apportent rien par rapport à 45 secondes.** Un seul titre est arrivé après plus d'une seconde (20 s). Les autres sont arrivés tout de suite. Les stations vides le sont restées 3 minutes. Une station envoie son titre dès la connexion, ou jamais.
- **La règle automatique produit trop de faux titres :** 6 des 21 textes classés « artiste – titre » sont faux (29 %). Appliquée telle quelle, elle afficherait un faux titre presque une fois sur trois, contrairement à la règle « jamais de faux titre ».
- **Le continent américain reste le plus pauvre :** sur les 13 stations vides, 9 sont en Amérique.
- **Le filtre musique laisse passer environ 7 radios de parole sur 53,** toujours avec des tags vagues (`archive`, `community radio`, `christian`, `education`, `full service`).

### Limites

- **Un cache a réduit l'échantillon :** les tirages 2 et 3, lancés à la même seconde, ont pioché 7 stations identiques. Cause probable : le serveur de Radio Browser renvoie la même réponse à deux requêtes identiques et simultanées. Pour la prochaine fois, espacer les tirages.
- **20 pays seulement, une station par pays et par tirage :** les résultats par continent restent indicatifs.
- **HLS et OGG toujours non couverts :** 7 stations sur 53 (6 en HLS, 1 en OGG).

### Conséquences pour ELS-22 (service stations)

La classification des titres devient une règle testée, avec au minimum ces cas réels comme tests :

| Texte reçu | Résultat attendu |
| --- | --- |
| `23087 - 20956` | pas un titre (parties uniquement numériques) |
| `SPRINGBOK (511) - MONDAY - WEDNESDAY` | pas un titre (jours, numéro d'épisode) |
| `Radio Plus - Écouté ou pou tendé` | pas un titre (commence par le nom de la station) |
| `GOSPEL - SHOW Bloco3` | pas un titre (mots de programme) |
| `onetv_ng - (Nwa Eze Efunamba) &#8211; God Bless You Papa` | pas un titre, ou titre nettoyé (entité HTML `&#8211;`, nom de compte) |
| `Now On Air:Hozier - Too Sweet` | Hozier – Too Sweet (préfixe retiré) |
| `ACDC - Send for the Man` sur la station « ACDC » | AC/DC – Send for the Man (le nom de la station seul ne suffit pas à rejeter) |
| `Dance On The Groove (and Do The Funk)-Love International` | à trancher : tiret sans espaces |

Le filtre `isMusicStation` doit aussi devenir une règle testée de l'application, avec sa liste de mots de parole en plusieurs langues.
