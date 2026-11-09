# Contribuer à Elsewhere

Ce fichier fixe les conventions du dépôt. Elles s'appliquent à tout le code, qu'il soit écrit à la main ou avec un agent.

## Nommage dans le code

| Élément | Convention | Exemple |
| --- | --- | --- |
| Variables et fonctions JavaScript | camelCase | `currentTrack`, `getStationById()` |
| Composants React | PascalCase, un composant par fichier | `StationCard.jsx` |
| Constantes globales | MAJUSCULES_AVEC_TIRETS_BAS | `MAX_STATIONS_PER_PAGE` |
| Fichiers JavaScript hors composants | kebab-case | `station-service.js` |
| Fichiers de test | nom du fichier testé + `.test.js`, à côté de lui | `station-service.test.js` |
| Tables SQL | snake_case, au pluriel | `users`, `list_stations` |
| Colonnes SQL | snake_case, au singulier | `created_at`, `station_id` |
| Clés étrangères | `<table au singulier>_id` | `user_id` |
| Variables d'environnement | MAJUSCULES_AVEC_TIRETS_BAS | `DATABASE_URL` |
| Routes de l'API | kebab-case, ressources au pluriel | `GET /api/stations/:id` |

Les noms du code sont en anglais, les commentaires en français (voir `CLAUDE.md`).

## Branches

Une branche par ticket Linear, créée depuis `main`. On utilise le nom proposé par Linear (bouton « Copy git branch name ») :

```
gvlaurent/els-<numéro>-<titre-du-ticket>
```

Linear reconnaît ce format et relie tout seul la branche et la pull request au ticket.

Chaque ticket a son propre **worktree** : un dossier séparé, relié au même dépôt Git, qui a sa branche à lui. On le crée avec Orca, et son nom affiché commence par `ELS-<numéro>`.

- On ne change jamais de branche dans un dossier pour passer à un autre ticket : on ouvre le worktree du ticket.
- Une fois la PR fusionnée, on supprime le worktree, puis la branche locale. GitHub supprime la branche distante tout seul.
- Pour la branche locale, il faut `git branch -D` (D majuscule) : après un squash, Git ne retrouve pas les commits de la branche dans `main` et refuse la suppression prudente `git branch -d`.

## Commits

Format court inspiré de *Conventional Commits* : un type, un résumé en français, l'identifiant du ticket.

```
<type>: <ce que fait le commit> (ELS-<numéro>)
```

| Type | Usage |
| --- | --- |
| `feat` | nouvelle fonctionnalité |
| `fix` | correction de bug |
| `test` | ajout ou modification de tests |
| `docs` | documentation seule |
| `refactor` | réorganisation du code sans changement de comportement |
| `chore` | outillage, configuration, dépendances |

Exemple : `feat: affiche le titre en cours d'une station (ELS-21)`

## Pull requests

- Jamais de push direct sur `main` : tout passe par une pull request, même en solo.
- Le titre de la PR reprend le format des commits.
- Les PR sont fusionnées en squash : tous leurs commits deviennent un seul commit sur `main`, dont le message est le titre de la PR, suivi de son numéro ajouté par GitHub (par exemple `(#3)`). On obtient ainsi une ligne par ticket dans l'historique. GitHub est configuré pour n'autoriser que ce mode.
- La description suit le modèle `.github/pull_request_template.md`, qui contient la Definition of Done. Une PR n'est fusionnée que lorsque toutes ses cases sont cochées.
- Une case qui ne s'applique pas est cochée et suivie de la mention `(sans objet : documentation uniquement)`. Seules les cases liées au code (tests, commentaires, explication Notion) peuvent l'être, et seulement si le diff ne contient que de la documentation.
