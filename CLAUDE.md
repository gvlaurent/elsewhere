# Elsewhere

Application d'écoute des radios du monde, construite seul par Gabriel.
Échéances : soutenance Jedha le 14 décembre 2026 (produit minimum), passage du titre CDA RNCP37873 en mars 2027 (version complète).

## Au début de chaque session

- Charger le skill Notion « Skill — Reprendre et faire avancer le projet Elsewhere (solo, Jedha + RNCP CDA) » : https://app.notion.com/p/4097c7730ade813c9c10eafa61206e26
- Consulter le Kanban (vue « Par sprint ») pour connaître le sprint en cours : https://app.notion.com/p/4282299a4b69402797dc5f4eecc6c6f9
- Référence du périmètre : `docs/prd.md`. Architecture : `docs/architecture.md`.

## Stack

- API : Node.js + Express, en couches : routes → contrôleurs → services → accès aux données.
- Interface : React + Vite.
- Base : PostgreSQL chez Supabase, utilisé comme base uniquement. Authentification, règles d'accès et validation sont codées dans Express.

## Règles permanentes

- Jamais de faux titre : si un flux ne donne pas le titre en cours, on ne l'invente pas.
- Aucun secret dans le dépôt : variables d'environnement, `.env` ignoré par Git, `.env.example` à jour.
- Une branche et une pull request par tâche, même en solo.
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

- `nouvelle-fonctionnalite` : pour coder une user story.
- `relecture-avant-pr` : avant chaque pull request.
- `expliquer-code-notion` : dès qu'un code est validé.
- `fin-de-session` : à la fin de chaque session de travail.
