# ELS-6 — Quel annuaire de stations pour Elsewhere ?

Comparaison du 10 novembre 2026, complétée le 11 novembre (Wikidata, Radio Garden, licence de Radio Browser).

## Pourquoi ce choix

Elsewhere ne diffuse aucun son lui-même : il liste des stations et lit leur flux. Il lui faut donc un **annuaire**, c'est-à-dire une base qui donne pour chaque station son nom, son pays et l'adresse de son flux. Ce choix conditionne la couverture du monde (le cœur du produit), le schéma de la table `stations` et ce que l'application a le droit de stocker.

## Critères

1. **Couverture** : nombre de pays et de stations, y compris hors Europe et Amérique du Nord.
2. **Accès** : API ouverte ou non, clé obligatoire, quotas.
3. **Droit de réutilisation** : licence des données, droit de les stocker (cache) dans notre base.
4. **Champs utiles** : adresse de flux résolue, codec, HLS, pays, coordonnées, indicateur « flux vérifié ».
5. **Pérennité** : service maintenu en 2026, risque de fermeture.

## Candidats

| Critère       | Radio Browser                                                                                                                                                                                                | Shoutcast                                                                                               | TuneIn                                | Radio Garden                                                              | Icecast (dir.xiph.org)                                      | Wikidata                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Couverture    | 52 572 stations, 224 pays (API `/json/stats`, 10/11/2026)                                                                                                                                                    | Non chiffrée                                                                                            | Large, non chiffrée                   | Plus de 40 000 stations annoncées en 2024 (Wikipédia), pays non chiffrés  | Uniquement les serveurs Icecast                             | **680 stations, 65 pays** ayant une adresse de flux (requête SPARQL, 11/11/2026)    |
| Accès         | API ouverte, sans clé, sans quota annoncé                                                                                                                                                                    | « Developer ID » délivré à la discrétion de Shoutcast                                                   | Aucune documentation publique trouvée | Aucune API publique trouvée ; origine de la liste de stations non publiée | Site consultable, fichier `yp.xml` injoignable lors du test | Point d'accès SPARQL ouvert, sans clé                                               |
| Réutilisation | Aucune licence formelle des données. La documentation officielle autorise à « mirror all its data » (recopier toutes les données). Le logiciel serveur est sous AGPL-3.0 (concerne le code, pas les données) | **Stockage interdit** : « copy, duplicate, or store any Directory Information » (licence API, art. 4.5) | Conditions illisibles (page vide)     | Conditions introuvables                                                   | Aucune condition publiée                                    | Données sous CC0 (domaine public)                                                   |
| Champs utiles | `url_resolved`, `codec`, `bitrate`, `hls`, `countrycode`, `geo_lat`, `geo_long`, `tags`, `lastcheckok`                                                                                                       | Non vérifié                                                                                             | Non vérifié                           | Non vérifié                                                               | Nom, genre, codec                                           | Adresse de flux (P963), pays (P17), logo, ville ; aucun contrôle que le flux marche |
| Pérennité     | Projet communautaire, plusieurs serveurs miroirs                                                                                                                                                             | Licence API datée de 2018, aucune mention récente de l'API                                              | Service commercial actif              | Projet néerlandais à but non lucratif, lancé en décembre 2016             | Directory toujours « BETA »                                 | Projet de la fondation Wikimedia                                                    |

## Ce qu'on retient

- **Seul Radio Browser est réellement utilisable** par une petite application : API ouverte, sans clé, avec les champs dont Elsewhere a besoin (`url_resolved` pour lire le flux, `hls` pour repérer les flux non testables en ICY, `lastcheckok` pour écarter les stations en panne, `geo_lat`/`geo_long` pour la carte).
- **Shoutcast est exclu** : sa licence interdit de stocker les données, ce qui empêche le cache prévu en base (S7 « Cache et admin »).
- **TuneIn et Radio Garden** n'offrent pas d'accès documenté : les utiliser reviendrait à aspirer leur site, ce qu'on s'interdit.
- **Wikidata a la meilleure licence mais une couverture trop faible** : 680 stations, soit environ 77 fois moins que Radio Browser. Il reste utilisable en complément (logo, ville d'une station déjà connue), pas comme source principale.
- **Choisir l'annuaire ne règle pas les droits de diffusion.** Radio Garden est réservé aux stations britanniques pour ses utilisateurs au Royaume-Uni, « due to licensing reasons and concerns around copyright laws », et a été interdit en Turquie en janvier 2022 après que le régulateur RTÜK a exigé le paiement d'une licence (Wikipédia). Rendre écoutables des radios d'un pays à l'autre pose donc une question de droits de diffusion, indépendante de l'annuaire choisi.
- **Les limites de Radio Browser, mesurées pendant le retest d'ELS-5 (10 novembre, 53 stations) :**
  - aucun champ « musique / parole » : le tri repose sur les `tags`, des étiquettes libres, presque toujours en anglais ou en espagnol. Le filtre écrit pour le retest laisse passer environ 7 radios de parole sur 53 ;
  - `hidebroken` ne garantit pas qu'un flux marche : 1 station sur 53 a refusé la connexion ;
  - deux requêtes identiques et simultanées peuvent recevoir la même réponse (cache), ce qui fausse un tirage `order=random`.

## Règles d'usage de Radio Browser

Tirées de la documentation officielle ([https://api.radio-browser.info/](https://api.radio-browser.info/)) :

- Envoyer un `User-Agent` qui nomme l'application (par exemple `elsewhere/0.1`).
- Ne jamais coder en dur un serveur : interroger le DNS `all.api.radio-browser.info`, mélanger la liste, réessayer sur le serveur suivant en cas d'échec.
- Appeler `/json/url/{stationuuid}` à chaque lecture lancée : cela compte un « clic » et aide la communauté à classer les stations.
- Identifier une station par `stationuuid`, jamais par `id` ; utiliser `countrycode` (code ISO à deux lettres), jamais `country` (nom libre).
- Garder l'étape de découverte des serveurs : la documentation prévient que chacun « may go down in the future ».

## Décision et risques

**Décision :** pour le produit minimum, Elsewhere utilise Radio Browser comme unique annuaire de stations. C'est le seul candidat qui combine une API ouverte sans clé, une couverture mondiale (224 pays) et l'autorisation écrite de recopier ses données. Wikidata (680 stations) est écarté comme source principale et gardé comme complément possible après la soutenance.

- **Risque :** flux injoignable malgré `hidebroken` (1 station sur 53 au retest d'ELS-5) => **Parade :** ne demander que les stations dont le dernier test a réussi (`hidebroken=true`). Au-delà de 5 secondes sans son, afficher « Station injoignable » et proposer 3 autres stations du même pays, en privilégiant des stations avec des tags similaires.
- **Risque :** tirage « Surprends-moi » faussé par le cache de Radio Browser => **Parade :** récupérer une liste large de stations, puis faire le tirage au sort dans l'API Express d'Elsewhere, jamais avec `order=random`.
- **Risque :** aucune licence formelle des données => **Parade :** stocker uniquement les champs utiles (`stationuuid`, nom, `countrycode`, `url_resolved`, codec, coordonnées). Citer Radio Browser avec un lien dans l'application et dans le README. Respecter ses règles d'usage (`User-Agent`, clics) et rédiger une politique d'usage des données.
- **Risque :** droits de diffusion d'un pays à l'autre (Radio Garden restreint au Royaume-Uni, interdit en Turquie) => **Parade :** Elsewhere ne relaie jamais le son. Le navigateur de l'utilisateur lit directement le flux officiel de la station. Le projet est non commercial, et une station peut demander son retrait par un contact affiché dans l'application.
- **Risque :** tags libres, aucun tri musique/parole fiable => **Parade :** le produit minimum ne propose pas ce tri. Les tags sont affichés tels quels, et un tri fiable est reporté après la soutenance (ELS-57).

**Point ouvert :** une page en `https` ne peut pas lire un flux en `http` (contenu mixte bloqué par les navigateurs). Sans relais du son par le serveur, seuls les flux `https` seront lisibles. Leur part dans Radio Browser reste à mesurer, dans le cadre d'ELS-22 (service stations, filtrage HTTPS).

## Sources

- Documentation de l'API Radio Browser : [https://api.radio-browser.info/](https://api.radio-browser.info/)
- Statistiques Radio Browser : [https://de1.api.radio-browser.info/json/stats](https://de1.api.radio-browser.info/json/stats)
- Licence du logiciel serveur Radio Browser (AGPL-3.0) : [https://github.com/segler-alex/radiobrowser-api-rust/blob/master/LICENSE](https://github.com/segler-alex/radiobrowser-api-rust/blob/master/LICENSE)
- Licence de l'API Shoutcast : [https://www.shoutcast.com/legal/agreements/api](https://www.shoutcast.com/legal/agreements/api)
- Conditions d'utilisation Shoutcast : [https://www.shoutcast.com/legal/terms](https://www.shoutcast.com/legal/terms)
- Directory Icecast : [https://dir.xiph.org/](https://dir.xiph.org/)
- Radio Garden (historique, taille, restrictions Royaume-Uni et Turquie) : [https://en.wikipedia.org/wiki/Radio_Garden](https://en.wikipedia.org/wiki/Radio_Garden)
- Point d'accès SPARQL de Wikidata : [https://query.wikidata.org/](https://query.wikidata.org/) (requête : éléments « station de radio » (Q14350 et sous-classes) ayant une adresse de flux (P963), comptés avec leur pays (P17))
- Licence des données Wikidata (CC0) : [https://www.wikidata.org/wiki/Wikidata:Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
