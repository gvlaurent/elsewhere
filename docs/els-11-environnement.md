# ELS-11 — Environnement de travail d'Elsewhere

Relevé du 12 novembre 2026, à l'initialisation de l'API et de l'interface.

## Pourquoi ce document

Le titre CDA demande de savoir **installer et configurer son environnement de travail**. Ce document en garde la preuve : quels outils, quelles versions, pourquoi ces choix, et comment remettre le projet en route sur une autre machine.

Les versions sont celles réellement installées, relevées avec `node -v`, `npm -v` et les fichiers `package.json` des paquets. Les numéros exacts des dépendances sont figés dans `api/package-lock.json` et `web/package-lock.json`.

## Poste de travail

| Outil | Version | Rôle | Pourquoi ce choix |
| --- | --- | --- | --- |
| Ubuntu | 26.04.1 LTS | Système d'exploitation | Version à support long (LTS) : mises à jour de sécurité pendant plusieurs années |
| Node.js | 24.21.0 | Exécute le JavaScript hors du navigateur (API, outils) | Version LTS ; lit le fichier `.env` sans bibliothèque (`--env-file-if-exists`) |
| npm | 11.19.0 | Installe les paquets et lance les scripts | Fourni avec Node, aucun outil de plus à apprendre |
| Git | 2.53.0 | Historique du code, une branche par ticket | Standard du métier ; worktrees pour travailler sur un ticket à la fois |
| GitHub CLI (`gh`) | 2.46.0 | Pull requests depuis le terminal | Évite les allers-retours avec le site GitHub |
| Cursor | 3.29.15 | Éditeur de code avec assistant IA | Mêmes règles et skills que Claude Code (voir `HARNAIS.md`) |

## API (`api/`)

| Paquet | Version | Rôle | Pourquoi ce choix |
| --- | --- | --- | --- |
| Express | 5.3.0 | Serveur HTTP : routes et middlewares | Le plus répandu en Node, simple à organiser en couches |
| `node:test` | intégré à Node 24 | Lance les tests (`npm test`) | Aucune dépendance à installer pour tester |
| ESLint | 10.14.0 | Repère les erreurs avant l'exécution (`npm run lint`) | Standard du JavaScript ; même outil que l'interface |
| `@eslint/js` | 10.0.1 | Règles recommandées de JavaScript | Base de règles maintenue par l'équipe d'ESLint |
| `globals` | 17.14.0 | Variables globales de Node (`process`, `console`…) | Évite les fausses alertes « variable inconnue » |

## Interface (`web/`)

| Paquet | Version | Rôle | Pourquoi ce choix |
| --- | --- | --- | --- |
| React | 19.3.1 | Construit l'interface en composants | Bibliothèque d'interface très répandue ; un composant par morceau d'écran |
| Vite | 8.3.8 | Serveur de développement et construction du site | Démarrage en moins d'une seconde, rechargement à chaque enregistrement |
| `@vitejs/plugin-react` | 6.3.0 | Permet à Vite de lire le JSX | Plugin officiel de Vite pour React |
| ESLint | 10.14.0 | Repère les erreurs (`npm run lint`) | Même outil que l'API |
| `eslint-plugin-react-hooks` | 7.1.1 | Règles d'usage des hooks React | Évite des bogues classiques de React |
| `eslint-plugin-react-refresh` | 0.5.7 | Vérifie la compatibilité avec le rechargement de Vite | Fourni par le modèle Vite |

## Lancer le projet

Prérequis : Node.js 24 ou plus récent (champ `engines` des deux `package.json`).

```bash
# API, sur http://localhost:3000
cd api
cp .env.example .env    # puis adapter les valeurs si besoin
npm install
npm run dev             # redémarre à chaque enregistrement
npm test
npm run lint

# Interface, sur http://localhost:5173 (dans un second terminal)
cd web
npm install
npm run dev
npm run lint
```

## Point de vigilance : alertes de sécurité d'ESLint

`npm audit` signale 4 failles de gravité moyenne dans `minimatch`, une bibliothèque utilisée par ESLint 10. Décision : **ne rien changer pour l'instant**.

- `npm audit --omit=dev` ne trouve aucune faille : le code qui tourne en ligne n'est pas concerné, seul l'outil de développement l'est.
- La correction proposée (`npm audit fix --force`) ramènerait ESLint à la version 9, ce qui casserait la configuration.
- À revoir quand une version d'ESLint corrigée sera publiée.
