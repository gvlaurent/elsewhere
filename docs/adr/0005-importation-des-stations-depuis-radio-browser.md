# ADR-0005 : l'API importe les stations de Radio Browser par pays, trie dans un service pur et écrit en une transaction

Date : 28 novembre 2026 (ELS-22). Statut : accepté.

## Contexte

Radio Browser est l'unique annuaire de stations (ELS-6). Le navigateur ne doit jamais lui parler (C11) : l'API recopie les stations dans sa base et les sert depuis là. Il faut décider comment l'API interroge l'annuaire, où vivent les règles de tri, et comment une station est rattachée à un lieu, alors que Radio Browser ne connaît que des pays et un champ libre `state`.

La page d'Elsewhere est en HTTPS : un navigateur y bloque un flux en `http://` (contenu mixte). Le point ouvert d'ELS-6, « quelle part des flux est en HTTPS ? », est mesuré ici.

## Décision

**Un client Radio Browser** (`api/src/clients/radio-browser-client.js`), rangé dans la couche d'accès aux données mais pour une source extérieure :

- il trouve les serveurs par le DNS (`_api._tcp.radio-browser.info`), les mélange et passe au suivant en cas d'échec, comme le demande la documentation de Radio Browser ;
- chaque requête a un délai maximal (10 s, `AbortSignal.timeout`) ; si aucun serveur ne répond, il lève `RadioBrowserUnavailableError` ;
- il envoie le User-Agent générique `Elsewhere/0.1`, sans donnée personnelle ;
- il vérifie la forme de la réponse avec Zod et ne garde que les champs utiles. Une station mal formée devient une station vide, que le service écarte, au lieu de faire échouer toute l'importation ;
- il utilise le `fetch` natif de Node 24, sans bibliothèque.

**Le tri vit dans un module pur** (`api/src/services/station-selection.js`), sans réseau ni base, donc testable seul. Dans l'ordre :

1. **invalide** : `stationuuid` qui n'est pas un UUID, ou nom vide ;
2. **lieu inconnu** : le champ `state` ne contient l'alias d'aucun lieu du pays (comparaison sans majuscules ni accents) ;
3. **hors ligne** : `lastcheckok` différent de 1 ;
4. **pas en HTTPS** : l'adresse du flux (`url_resolved`, sinon `url`) n'est pas en `https://` ;
5. **doublon** : même identifiant, même flux, ou même nom dans le même lieu qu'une station déjà gardée. La plus votée est gardée.

Le rattachement passe avant les autres règles : ainsi « hors ligne », « pas en HTTPS » et « doublon » se comptent lieu par lieu, et « lieu inconnu » et « invalide » pays par pays.

**Le rattachement se fait par alias**, définis lieu par lieu dans `api/src/config/starting-places.js` (Lagos, Lagos State ; Lisboa, Lisbon…). Les stations sont demandées pays par pays (`/json/stations/bycountrycodeexact/NG`), puis réparties entre les lieux. Un pays n'est demandé qu'une fois, même s'il a plusieurs lieux. `hidebroken` n'est pas demandé : le service écarte lui-même les stations hors ligne, et peut les compter.

**L'importation lit tout avant d'écrire, puis écrit en une transaction** (`api/src/db/transaction.js`). Si l'annuaire ne répond pas, rien n'est écrit et le cache garde ses stations d'avant. Les stations sont écrites en une requête par lieu (`INSERT … SELECT FROM unnest(…) ON CONFLICT (external_id) DO UPDATE`), en SQL paramétré. Une station déjà connue n'est réécrite que si elle a changé, et son statut (`active` ou `hidden`) n'est jamais modifié : une station masquée par un admin le reste (C10).

**La liste des lieux est un fichier de configuration, pas une migration.** Elle change avec le produit (un alias à ajouter), sans changer la structure de la base. Aucune migration n'est ajoutée : les tables `places` et `stations` de la migration 001 suffisent.

## Options écartées

- **Filtrer côté Radio Browser** (`hidebroken=true`, `state=Lagos`) : moins de données transférées, mais on ne saurait plus compter les stations écartées par raison, et le filtre `state` de Radio Browser ne gère qu'un seul texte par requête.
- **Rattacher par les coordonnées GPS** (`geo_lat`, `geo_long`) : plus précis, mais presque aucune station n'en a (1 sur 31 au Sénégal le 28/11/2026).
- **Une requête SQL par station** : plus simple à lire, mais des centaines d'allers-retours vers Supabase. `unnest` garde le SQL paramétré en une seule requête.
- **Une route HTTP pour lancer l'importation** : inutile tant que l'importation est lancée à la main (`npm run stations:import`). La tâche de chaque nuit (ELS-37) appellera le même service.

## Conséquences

- Les tests simulent Radio Browser (faux `fetch`, faux DNS) : `npm test` ne fait aucun appel réseau vers l'annuaire.
- Une station qui disparaît de l'annuaire, ou qui passe hors ligne, reste dans le cache : la retirer relève de la synchro de chaque nuit (ELS-37, C10).
- Le compte « lieu inconnu » montre qu'un alias manque. Le 28/11/2026, **aucune** station du Sénégal n'a de champ `state` rempli : Dakar n'a donc aucune station avec cette règle. Une autre règle pour ce cas est une décision de produit, à prendre dans un ticket.
- Mesure du point ouvert d'ELS-6 (essai du 28/11/2026, 6 lieux) : sur 224 stations en ligne rattachées à un lieu, 62 n'ont qu'un flux en `http://`, soit environ **28 % de stations illisibles** dans une page HTTPS.
