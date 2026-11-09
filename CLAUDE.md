# Elsewhere

Application d'écoute des radios du monde, construite seul par Gabriel.
Échéances : soutenance Jedha le 14 décembre 2026 (produit minimum), passage du titre CDA RNCP37873 en mars 2027 (version complète).

## Au début de chaque session

- Charger le skill Notion « Skill — Reprendre et faire avancer le projet Elsewhere (solo, Jedha + RNCP CDA) » : https://app.notion.com/p/4097c7730ade813c9c10eafa61206e26
- Consulter le projet Linear pour connaître le sprint en cours (un sprint = un jalon, par exemple « S0 Cadrage ») : https://linear.app/gvlaurent/project/elsewhere-mvp-soutenance-14-dec-f6c8265910be
- Avant d'attaquer un nouveau ticket, lui créer son worktree Orca (voir `CONTRIBUTING.md`, section « Branches ») au lieu de changer de branche dans le dossier courant.
- Référence du périmètre : `docs/prd.md`. Architecture : `docs/architecture.md`. Ces deux fichiers n'existent pas encore : en attendant, le ticket Linear fait référence.

## Stack

- API : Node.js + Express, en couches : routes → contrôleurs → services → accès aux données.
- Interface : React + Vite.
- Base : PostgreSQL chez Supabase, utilisé comme base uniquement. Authentification, règles d'accès et validation sont codées dans Express.

## Règles permanentes

- Jamais de faux titre : si un flux ne donne pas le titre en cours, on ne l'invente pas.
- Aucun secret dans le dépôt : variables d'environnement, `.env` ignoré par Git, `.env.example` à jour.
- Nommage, branches, commits, pull requests et Definition of Done : voir `CONTRIBUTING.md`.
- Gabriel n'est pas ingénieur : expliquer chaque choix technique simplement, sans appauvrir le fond.
- Ne jamais copier de code de l'équipe Jedha.
- Demander confirmation avant de supprimer des fichiers ou des pages Notion, ou de réécrire l'historique Git.

## Commentaires dans le code

- En français, et le code reste propre pour le jury.
- En tête de fichier : son rôle dans l'architecture. En tête de fonction : pourquoi elle existe et ce qu'elle fait.
- Notes ponctuelles seulement sur les lignes délicates : asynchrone, sécurité, SQL, contournement non évident.
- Jamais de commentaire à chaque ligne. Un commentaire devenu faux est corrigé ou supprimé.
- L'explication ligne par ligne va dans Notion (skill `expliquer-code-notion`).

## Skills du projet

Rangés dans `.claude/skills/` :

- `nouvelle-fonctionnalite` : pour coder une user story.

## Skills à créer

Prévus mais pas encore dans le dépôt :

- `relecture-avant-pr` : avant chaque pull request.
- `expliquer-code-notion` : dès qu'un code est validé.
- `fin-de-session` : à la fin de chaque session de travail.
