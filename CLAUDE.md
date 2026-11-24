# Elsewhere

Application d'écoute des radios du monde, construite seul par Gabriel.
Échéances : soutenance Jedha le 14 décembre 2026 (produit minimum), passage du titre CDA RNCP37873 en mars 2027 (version complète).

## Au début de chaque session

- Faire le point depuis `main` : tickets Linear en cours (`list_issues`, équipe `Elsewhere`), PR ouvertes (`gh pr list`), worktrees (`git worktree list`), puis proposer le prochain ticket selon le jalon et les échéances.
- Charger le skill Notion « Skill — Reprendre et faire avancer le projet Elsewhere (solo, Jedha + RNCP CDA) » : https://app.notion.com/p/4097c7730ade813c9c10eafa61206e26
- Avant d'attaquer un nouveau ticket, lui créer son worktree Orca (voir `CONTRIBUTING.md`, section « Branches ») au lieu de changer de branche dans le dossier courant.
- Référence du périmètre : `docs/prd.md` (lire ses « écarts connus » en tête). Architecture : `docs/architecture.md` (couches de l'API, schémas, déroulé de « garder un moment »).

## Stack

- API : Node.js + Express, en couches : routes → contrôleurs → services → accès aux données.
- Interface : React + Vite.
- Base : PostgreSQL chez Supabase, utilisé comme base uniquement. Authentification, règles d'accès et validation sont codées dans Express.

## Règles permanentes

- Jamais de faux titre : si un flux ne donne pas le titre en cours, on ne l'invente pas.
- Aucun secret dans le dépôt : variables d'environnement, `.env` ignoré par Git, `.env.example` à jour.
- Nommage, branches, commits, pull requests et Definition of Done : voir `CONTRIBUTING.md`.
- Architecture à jour : toute pull request qui change un statut (décidé → codé, question tranchée), une couche, un middleware, une ressource de l'API, une table, un service externe ou l'hébergement met à jour `docs/architecture.md` et le schéma du `README.md` dans la même PR (voir la fin de `docs/architecture.md`).
- Gabriel n'est pas ingénieur : expliquer chaque choix technique simplement, sans appauvrir le fond.
- Ne jamais copier de code de l'équipe Jedha.
- Demander confirmation avant de supprimer des fichiers ou des pages Notion, ou de réécrire l'historique Git.

## Commentaires dans le code

- En français, et le code reste propre pour le jury.
- En tête de fichier : son rôle dans l'architecture. En tête de fonction : pourquoi elle existe, ce qu'elle reçoit et ce qu'elle renvoie. C'est là que vit l'explication détaillée.
- Notes ponctuelles seulement sur les lignes délicates : asynchrone, sécurité, SQL, contournement non évident.
- Jamais de commentaire à chaque ligne. Un commentaire devenu faux est corrigé ou supprimé.
- L'explication ligne par ligne va dans Notion (skill `expliquer-code-notion`).

## Façon de travailler : skills de Matt Pocock

Le harnais d'Elsewhere est le plugin `mattpocock-skills`. Le plugin `harnais` est désactivé pour ce projet (`.claude/settings.json`). Parcours d'un ticket :

1. `/grill-with-docs` : se faire questionner sur le besoin, et mettre à jour `GLOSSARY.md` et les ADR au passage.
2. `/to-spec` puis `/to-tickets` : écrire la spec et la découper en tickets Linear (tranches verticales).
3. Créer le worktree Orca du ticket, puis `/implement ELS-<n>` : code en TDD (`/tdd`, test d'abord), puis `/code-review`.
4. `/pr` pour la description, en gardant le modèle `.github/pull_request_template.md` et sa Definition of Done.
5. `/diagnosing-bugs` pour un bug, `/prototype` pour une question de conception, `/handoff` pour passer la main à une autre session.

Skills propres au projet, rangés dans `.claude/skills/` (Pocock ne couvre pas Notion) :

- `expliquer-code-notion` : dès qu'un code est validé.
- `fin-de-session` : à la fin de chaque session de travail (Linear, Journal Elsewhere, reprise).

Cursor lit seulement les règles (`.cursor/rules/`) ; les skills sont pour Claude Code.

## Agent skills

### Issue tracker

Tickets dans Linear (équipe `Elsewhere`, `ELS-<n>`), code et PR sur GitHub. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq étiquettes par défaut (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), en étiquettes Linear. Voir `docs/agents/triage-labels.md`.

### Domain docs

Contexte unique : `GLOSSARY.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.
