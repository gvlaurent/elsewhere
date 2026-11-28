# ADR-0003 : l'API et l'interface sont hébergées chez Render, sur une seule adresse

Date : 28 novembre 2026 (ELS-15). Statut : accepté.

## Contexte

Le PRD laissait l'hébergeur à choisir (section 11). Il faut mettre en ligne l'API Express et l'interface React, avec un déploiement automatique qui ne part jamais d'une version cassée (story C13), pour une démo le 14 décembre 2026. Supabase reste la base. Gabriel est seul et veut un outil simple, avec un coût faible.

## Décision

Tout est chez **Render**, décrit dans `render.yaml` à la racine du dépôt (un « Blueprint ») :

- `elsewhere-api` : un service web Node 24 à Francfort, construit depuis `api/` ; il lance la migration puis le serveur, et Render vérifie `GET /api/health` avant de basculer.
- `elsewhere-web` : un site statique construit par Vite depuis `web/`.
- **Une seule adresse pour le navigateur** : le site statique transmet `/api/*` à l'API (règle de réécriture). L'interface appelle donc `/api/…` sans connaître l'adresse de l'API, et l'API n'a pas besoin d'ouvrir le CORS (l'autorisation donnée à un autre site d'appeler l'API). En développement, Vite fait la même chose vers `localhost:3000`.
- **Déploiement seulement après une CI verte** : `autoDeployTrigger: checksPass` sur les deux services.

## Options écartées

- **Railway** : pas de mise en veille, mais facturé à l'usage dès le départ et un peu moins guidé.
- **Vercel pour l'interface et Render pour l'API** : deux comptes, deux configurations, et le CORS à ouvrir entre deux adresses.

## Conséquences

- L'offre gratuite de l'API **s'endort** après une période sans visite : le premier appel prend environ 30 secondes. Pour la soutenance, passer `elsewhere-api` en offre payante en décembre (`plan` dans `render.yaml`).
- L'offre gratuite n'a pas de commande d'avant-déploiement : la migration tourne au démarrage du serveur. Elle ne fait rien si la base est à jour. Si elle échoue, le serveur ne démarre pas et Render garde la version précédente en ligne. Une seule instance tourne : le risque de deux migrations simultanées signalé dans l'ADR-0001 ne se pose pas encore.
- Le secret `DATABASE_URL` est saisi dans le tableau de bord de Render, jamais dans le dépôt.
- La règle de réécriture vise `https://elsewhere-api.onrender.com`. Si Render donne une autre adresse à l'API (nom déjà pris), il faut corriger `render.yaml`.
