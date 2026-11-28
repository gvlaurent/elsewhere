# ADR-0009 : un moment n'est lu ou supprimé que par son propriétaire, avec le même 404 pour « absent » et « pas à toi », et tout ce qu'il garde est calculé par le serveur

Date : 28 novembre 2026 (ELS-19). Statut : accepté.

## Contexte

F5 demande de garder un moment (lieu, station, heure locale, titre s'il est lisible, thème d'entrée s'il existe) ; F6 veut des moments privés, lus du plus récent au plus ancien. La table `moments` existe depuis la migration 001, avec l'index `moments_user_id_kept_at_idx`. L'authentification (ELS-17, ADR-0004) dit seulement **qui** est connecté ; il faut décider comment l'API garantit qu'un membre ne voit ni ne supprime que **ses** moments, ce qu'elle répond quand ce n'est pas le cas, et qui calcule les valeurs gardées.

## Décision

**Trois routes, toutes derrière `requireAuth`** : `POST /api/moments` `{ stationId, themeId? }` (201), `GET /api/moments` (200), `DELETE /api/moments/:id` (204). Aucune route ne lit un moment seul : aucun écran ne le demande encore.

**L'accès propriétaire est dans la requête SQL elle-même.** Le repository (`moments-repository.js`) n'a aucune fonction qui lise ou supprime un moment par son seul identifiant : la liste filtre par `user_id`, et la suppression est un seul `DELETE … WHERE id = $1 AND user_id = $2`. Il n'y a pas de « lire, vérifier, puis supprimer » : pas de fenêtre entre la vérification et l'action, et pas d'oubli possible dans un futur service.

**Un moment absent et le moment d'un autre membre reçoivent la même réponse : 404 « Moment introuvable ».** Le repository renvoie seulement « supprimé ou non » ; le service en fait un 404. Répondre 403 (« interdit ») au second cas confirmerait qu'un moment porte ce numéro : en essayant les numéros un à un, on apprendrait combien de moments existent et à quel rythme ils sont créés. Pour le membre honnête, les deux cas veulent dire la même chose : ce moment n'est pas dans son passeport.

**Une station masquée par un admin reçoit le même 404 qu'une station inconnue** (« Station introuvable ») : elle n'est plus proposée, on ne peut donc plus la garder. Un thème inconnu donne 404 « Thème introuvable ».

**Le navigateur n'envoie que des identifiants ; le serveur calcule tout le reste.**

- Les **copies** (nom de la station, du lieu, du pays, du thème) sont lues en base par le service, au moment de garder.
- Le **titre** passe par `freshTitle` (`services/fresh-title.js`, partagé avec le tableau du direct, ELS-23) : gardé seulement s'il a été lu il y a moins de 5 minutes, sinon `null` (« titre indisponible »). Un titre envoyé par le navigateur est retiré par la validation.
- **Un seul instant**, pris par le service, sert à la règle du titre, à `kept_at` et à l'heure locale : le moment est cohérent avec lui-même.
- L'**heure locale** est calculée par PostgreSQL : `instant AT TIME ZONE 'Africa/Lagos'`, avec le fuseau du lieu (`places.timezone`). Ce sont les règles de fuseaux de PostgreSQL, tenues à jour par lui, qui gèrent l'heure d'été (Lisbonne : UTC+1 en juillet, UTC+0 en novembre).

**La réponse est en camelCase et ne contient jamais `user_id`** : `id`, `stationId`, `themeId`, `stationName`, `placeName`, `countryCode`, `countryName`, `themeName`, `trackTitle` (`null` = titre indisponible), `keptAt` (instant ISO en UTC) et `localTime`. `localTime` est renvoyé en **texte sans fuseau** (`2026-11-28T21:30:00`) : la colonne est une date et heure « telle qu'affichée sur place », et la bibliothèque `pg` la convertirait sinon en date JavaScript dans le fuseau du serveur, ce qui la fausserait.

**Les identifiants reçus sont bornés** à 2 147 483 647, le plus grand `integer` de PostgreSQL : au-delà, la base lèverait une erreur (500) au lieu d'un simple 400.

**Aucune migration** : la table et son index de la migration 001 suffisent. La migration 004, réservée pour ce ticket, n'est pas utilisée.

## Options écartées

- **403 pour le moment d'un autre** : plus « exact », mais révèle l'existence des moments des autres (voir plus haut).
- **Vérifier le propriétaire dans le service** (lire le moment, comparer `user_id`, puis supprimer) : deux requêtes au lieu d'une, et une règle de sécurité qu'un futur appel au repository pourrait oublier.
- **Calculer l'heure locale en JavaScript** (`Intl.DateTimeFormat`) : possible, mais il faudrait remettre en forme le texte produit ; PostgreSQL le fait en une expression, sur la même colonne qu'il stocke.
- **Laisser `now()` de la base fixer `kept_at`** : plus simple, mais deux horloges (celle de l'API pour la règle du titre, celle de la base pour l'instant) pourraient se contredire de quelques secondes.
- **Simuler les repositories avec `mock.module` de Node** : encore expérimental. Le service reçoit plutôt un dernier argument facultatif `{ repositories, now }` : l'application n'y touche pas, un test y passe des faux.

## Conséquences

- La preuve d'accès est double : le test du repository et le test HTTP montrent qu'un membre B ne liste ni ne supprime les moments d'un membre A, et que sa tentative de suppression reçoit exactement la même réponse qu'un numéro qui n'existe pas.
- Les tests HTTP utilisent les outils déjà en place (`start-app-for-tests.js`, `fetch` natif de Node) plutôt que supertest : même preuve, sans nouvelle dépendance.
- Le moment gardé sans compte (le navigateur garde `{ stationId, themeId }` pendant l'inscription, puis renvoie la même requête) relève d'ELS-26 : l'API n'a rien de plus à faire, puisque la même requête marche une fois connecté.
- Si un écran demande plus tard un moment seul (`GET /api/moments/:id`), il suivra la même règle : filtre par `user_id` dans la requête, 404 sinon.
