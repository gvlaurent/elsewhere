# ADR-0006 : l'interface utilise React Router, un seul module d'appel à l'API et un contexte de connexion

Date : 28 novembre 2026 (ELS-21, ELS-18). Statut : accepté.

## Contexte

L'interface n'avait qu'une page d'accueil. Les écrans de compte (inscription, connexion, compte) arrivent avec ELS-21, puis viendront les lieux, le direct, les thèmes, le lecteur et le passeport. Il faut un socle que chaque ticket réutilise, simple à lire pour un débutant :

- passer d'un écran à l'autre, avec une adresse par écran (un lien partagé ou une page rechargée doit rouvrir le bon écran) ;
- appeler l'API toujours de la même façon, et lire son format d'erreur commun `{ error: { message, details } }` ;
- savoir partout qui est connecté, alors que le cookie de session est `HttpOnly` : le JavaScript ne peut pas le lire (ADR-0004).

## Décision

**1. La navigation : React Router** (paquet `react-router`, en mode « déclaratif » : `<BrowserRouter>`, `<Routes>`, `<Route>`). Toute la carte des écrans tient dans `web/src/App.jsx`. Tous les écrans sont placés dans une mise en page commune (`components/Layout.jsx`) : la colonne mobile et la barre d'onglets. Render renvoie déjà `index.html` pour toute adresse hors de `/api` (`render.yaml`), ce qui permet de recharger `/connexion` sans erreur 404.

**2. Un seul module d'appel à l'API** : `web/src/api/api-client.js`, avec `fetch` sur `/api/...` à la même adresse que l'interface (ADR-0003). Il envoie le JSON, laisse le navigateur joindre le cookie (`credentials: 'same-origin'`), renvoie les données, ou lève une `ApiError` qui porte le code HTTP, le message et les champs fautifs. Les appels de chaque ressource sont rangés à côté (`auth-api.js` pour les comptes, puis `stations-api.js`…). Aucun écran n'appelle `fetch` lui-même.

**3. L'état « qui est connecté » dans un contexte React** (`auth/AuthProvider.jsx` et le crochet `useAuth()` de `auth/auth-context.js`). Au chargement, il demande `GET /api/auth/me` : 200 donne le membre, 401 veut dire « personne ». L'inscription, la connexion et la déconnexion passent par lui, pour que tous les écrans (barre d'onglets, page du compte) se mettent à jour ensemble.

**4. Une organisation de `web/src` par rôle** : `api/` (appels à l'API), `auth/` (état de connexion), `components/` (morceaux réutilisés : champ de formulaire, barre d'onglets…), `forms/` (règles communes aux formulaires), `pages/` (un écran par fichier). Les tests sont à côté du fichier testé.

**5. Les tests de l'interface avec Vitest et Testing Library**, dans un faux navigateur (jsdom). Ils vérifient ce que voit et fait la personne (étiquettes, messages, clavier), avec une fausse API : ils ne demandent ni serveur ni base, et tournent en CI dans le job « Interface ».

## Options écartées

- **Navigation faite à la main** (un `useState` qui choisit l'écran) : plus court au départ, mais pas d'adresse par écran, pas de bouton retour du navigateur, et il faudrait recoder ce que React Router fait déjà, ce qui serait plus dur à expliquer au jury.
- **Le mode « framework » de React Router ou Next.js** : chargement des données par écran, rendu côté serveur. Trop d'outils pour une interface servie en fichiers statiques par Render.
- **Une bibliothèque de requêtes (TanStack Query, axios)** : utile pour un cache de données, inutile pour quatre routes de compte. On pourra y revenir si les écrans du direct en ont besoin.
- **Garder l'état de connexion dans `localStorage`** : il pourrait dire « connecté » alors que la session a expiré, et rien de sensible ne doit y être rangé. Seule l'API sait si la session est valide.

## Conséquences

- Ajouter un écran : un fichier dans `pages/`, une ligne dans `App.jsx`, et un onglet dans `components/TabBar.jsx` s'il en a un.
- Au chargement, l'écran du compte affiche « Chargement… » le temps que l'API réponde à `/api/auth/me`, pour ne pas renvoyer un membre connecté vers la connexion par erreur.
- Si l'API est injoignable au chargement, l'interface se comporte comme pour un visiteur : on écoute sans compte.
- En développement, la console du navigateur montre un 401 sur `/api/auth/me` quand personne n'est connecté : c'est la réponse attendue, pas une panne.
