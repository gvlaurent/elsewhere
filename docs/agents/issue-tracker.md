# Gestionnaire de tickets : Linear (code et PR sur GitHub)

Les tickets d'Elsewhere vivent dans **Linear**, équipe `Elsewhere`, identifiants `ELS-<numéro>`. Le code, les branches et les pull requests vivent sur **GitHub** (`gvlaurent/elsewhere`). On n'utilise **jamais** GitHub Issues : ne pas lancer `gh issue create`.

Linear se manipule avec les outils du serveur MCP `linear` (par exemple `list_issues`, `get_issue`, `save_issue`, `save_comment`). Les outils acceptent directement les identifiants lisibles (`ELS-42`), le nom d'équipe `Elsewhere` et `me` pour Gabriel.

## Conventions

- **Créer un ticket** : vérifier d'abord avec `list_issues` (paramètre `query`) qu'il n'existe pas déjà. Puis `save_issue` avec `team: "Elsewhere"`, le projet du jalon en cours (aujourd'hui `Elsewhere — MVP soutenance 14 déc`), `assignee: "me"`, statut `Backlog` ou `Todo`. Description en français, phrases courtes, avec une section « Critères d'acceptation » en cases à cocher. Les détails pour agents vont dans une section repliable `+++ Agent notes` en fin de description.
- **Lire un ticket** : `get_issue` (titre, description, branche Git proposée), puis `list_comments` pour la discussion, qui n'est pas incluse.
- **Lister des tickets** : `list_issues` avec `team: "Elsewhere"` et les filtres `state`, `label`, `project`, `cycle`. Les résultats sont paginés : suivre `cursor` tant que `hasNextPage` vaut `true`.
- **Sous-ticket** : `save_issue` avec `parentId: "ELS-<parent>"`.
- **Blocage** : relations natives de Linear, `blockedBy: ["ELS-<n>"]` ou `blocks: [...]` dans `save_issue`. Un ticket est démarrable quand tous ses bloqueurs sont `Done` ou `Canceled` (`get_issue` avec `includeRelations: true`).
- **Commenter** : `save_comment` sur le ticket.
- **Étiquettes** : `save_issue` avec `addLabels` / `removeLabels` (jamais `labels`, qui remplace tout le jeu). Les étiquettes `BC01`, `BC02`, `BC03` (groupe « Bloc RNCP ») rattachent un ticket à un bloc de compétences du titre CDA.
- **Statuts** de l'équipe : `Backlog` → `Todo` → `In Progress` → `In Review` → `Done`, plus `Canceled` et `Duplicate`.

## Branches et pull requests

- Une branche par ticket, au nom proposé par Linear (champ `gitBranchName` de `get_issue`) : `gvlaurent/els-<numéro>-<titre>`. Linear relie seul la branche et la PR au ticket.
- Chaque ticket a son worktree Orca (voir `CONTRIBUTING.md`, section « Branches »).
- PR sur GitHub avec `gh pr create`, titre au format des commits : `<type>: <résumé> (ELS-<numéro>)`, description selon `.github/pull_request_template.md`.

## Clôture d'un ticket

- **Aucun agent ne passe un ticket en `Done`.** C'est la fusion de la PR sur GitHub, faite par Gabriel, qui le ferme : Linear le passe seul en `Done` grâce à `ELS-<n>` dans le titre de la PR.
- À l'ouverture de la PR, passer le ticket en `In Review` (`save_issue`, `state: "In Review"`) et y ajouter le lien de la PR en commentaire (`save_comment`).
- Ticket en plusieurs PR : écrire `Part of ELS-<n>` dans la description de chaque PR sauf la dernière ; Linear relie la PR sans fermer le ticket. Si une fusion l'a fermé trop tôt, le rouvrir en `In Progress`.
- Ticket abandonné : ne rien supprimer. Proposer à Gabriel de le passer en `Canceled` avec un commentaire qui donne la raison ; ne le faire qu'après son accord.
- Fin du travail d'un agent (`/implement`, `/wayfinder`) : commenter le ticket (fait, reste à faire, blocage) plutôt que changer son statut.

## Quand un skill dit « publier dans le gestionnaire de tickets »

Créer un ticket Linear comme ci-dessus.

## Quand un skill dit « récupérer le ticket concerné »

Le lire comme dans **Lire un ticket** ci-dessus. Une référence `ELS-<n>` dans un message de commit ou un nom de branche désigne un ticket Linear, pas une issue GitHub.

## Pull requests comme source de demandes

**Non.** Elsewhere est un projet solo : les PR ne sont pas triées comme des demandes.

## Opérations de `/wayfinder`

- **Carte** : un ticket parent étiqueté `wayfinder:map` (étiquette à créer à la première utilisation avec `create_issue_label`).
- **Ticket de décision** : sous-ticket de la carte (`parentId`), étiqueté `wayfinder:<type>` (`research`, `prototype`, `grilling` ou `task`).
- **Frontière** : sous-tickets ouverts de la carte, sans bloqueur ouvert ni personne assignée ; le premier dans l'ordre de la carte l'emporte.
- **Réserver** : `save_issue` avec `assignee: "me"` et statut `In Progress`.
- **Résoudre** : `save_comment` avec la réponse, statut `Done`, puis ajouter un pointeur (résumé + lien) dans la section « Decisions so far » de la carte.
