# ADR-0007 : le tableau du direct filtre le titre dans le service, et l'heure locale est calculée par le navigateur

Date : 28 novembre 2026 (ELS-23). Statut : accepté.

## Contexte

L'écran des lieux montre chaque lieu avec son heure locale et son nombre de radios ; le tableau du direct d'un lieu montre chaque station avec son titre en cours, s'il a été relevé il y a moins de 5 minutes, sinon « titre indisponible » (PRD, F1). Les deux écrans s'ouvrent sans compte. Trois questions techniques se posaient :

- où appliquer la règle des 5 minutes : en SQL, dans le service, ou dans l'interface ;
- où calculer l'heure locale : dans l'API ou dans le navigateur ;
- comment tester un service sans base, alors que les services existants importent directement leurs repositories.

## Décision

**1. La règle du titre vit à un seul endroit : `api/src/services/fresh-title.js`.** Le repository renvoie le titre brut et son heure de lecture (`last_title`, `last_title_read_at`) ; le service des lieux les passe à `freshTitle()` et n'envoie au client que le résultat, `title` (le titre, ou `null`). Ni l'heure de lecture ni un titre périmé ne quittent l'API. Les moments (ELS-19) utilisent la même fonction : la règle ne peut pas diverger entre le tableau et le moment gardé.

**2. L'heure locale est calculée par le navigateur**, avec `Intl.DateTimeFormat` et l'option `timeZone` (le fuseau IANA du lieu, `Africa/Dakar`). L'API n'envoie que le fuseau. Un crochet React (`useCurrentMinute`) renouvelle l'instant au début de chaque minute, pour que l'heure avance sans recharger la page ni rappeler l'API.

**3. Les routes des lieux sont publiques** (`GET /api/places`, `GET /api/places/:id/stations`), sans `requireAuth` : on écoute sans compte. L'identifiant du lieu est validé par Zod (entier positif, au plus la limite d'un `integer` PostgreSQL) ; un lieu inconnu répond 404.

**4. Le service des lieux reçoit ses repositories en option** (`{ repositories }`), les vrais par défaut. Ses tests lui passent des fonctions simulées et prouvent la règle du titre sans base ; les repositories, eux, sont testés sur la base jetable (ADR-0002).

**5. Côté interface, un crochet `useApiData`** porte les trois états honnêtes d'un écran qui lit l'API : chargement, erreur avec « Réessayer », succès. Une réponse qui arrive après un changement de lieu est ignorée.

## Options écartées

- **Filtrer le titre en SQL** (`WHERE last_title_read_at > now() - interval '5 minutes'`) : plus court, mais la règle existerait en deux endroits (SQL ici, JavaScript pour les moments), et elle quitterait les services, où le document d'architecture place les règles métier.
- **Calculer l'heure locale dans l'API** : l'heure serait figée à la réponse, il faudrait rappeler l'API chaque minute, et le serveur ferait un travail que le navigateur sait déjà faire, changements d'heure compris.
- **Une bibliothèque de dates** (Luxon, date-fns-tz) : inutile, `Intl` est fourni par tous les navigateurs visés.
- **Une bibliothèque de requêtes** (TanStack Query) : déjà écartée par l'ADR-0006 ; un crochet d'une trentaine de lignes suffit pour deux écrans.

## Conséquences

- Tant qu'aucun ticket ne relève le titre des flux, `last_title` reste vide : le tableau affiche « Titre indisponible » partout. C'est voulu, et un test prouve qu'un titre récent serait bien affiché.
- L'heure affichée dépend de l'horloge du téléphone ou de l'ordinateur de l'auditeur : une horloge fausse donne une heure locale fausse.
- Un fuseau inconnu du navigateur n'empêche pas l'écran de s'afficher : l'heure est simplement omise.
- Un lieu dont toutes les stations sont masquées disparaît de la liste, mais son tableau reste joignable par son adresse et dit qu'aucune radio n'y est en direct.
