# PRD Elsewhere — version solo pour la certification CDA

> **Source et statut.** Copie fidèle du document Claude Docs « PRD Elsewhere — version solo certification CDA » (version 1 du 30 octobre 2026), importée dans le dépôt le 11 novembre 2026 (ELS-62). Ce fichier fait désormais foi : toute modification du périmètre passe par une pull request.
>
> **Écarts connus avec les décisions prises depuis le 30 octobre**, à arbitrer dans des tickets dédiés. En attendant, la décision du Journal Elsewhere ou du ticket Linear l'emporte sur le texte ci-dessous :
>
> 1. **Radios musicales uniquement** (décision du 10 novembre). Le PRD parle des « radios du monde entier » sans restriction.
> 2. ~~**Persona principal**~~ : **tranché le 11 novembre 2026** (ELS-63). Julien reste le persona principal, Aminata la secondaire, comme dans la section 3.
> 3. **Calendrier (section 10)** : le PRD place le développement entre le 5 janvier et le 8 février. Le projet Linear prévoit un produit minimum codé et déployé pour la soutenance du 14 décembre (jalons S1 à S4), avec le déploiement continu dès le S1 (ELS-15).
> 4. **Guide du lieu (J4, chatbot RAG)** : hors périmètre ici, mais planifié en S4 (ELS-27, exigence Jedha) et présent dans les maquettes (ELS-7).
> 5. **Métadonnées (section 6)** : le test est fait (ELS-5). Un tiers des radios musicales donnent un vrai titre, et la règle actuelle afficherait 29 % de faux titres.
> 6. ~~**Questions ouvertes (section 11)**~~ : **tranché le 11 novembre 2026** (ELS-66). L'annuaire est choisi (Radio Browser, ELS-6). Le projet est présenté en solo au jury RNCP ; seule la présentation Jedha de 5 minutes du 14 décembre se fait en équipe (voir la section 1). Les dates du jury et la question de l'agent restent ouvertes en section 11.
> 7. ~~**Modèle de données (section 7)**~~ : **tranché le 11 novembre 2026** (ELS-63). 9 tables, `track_plays` remplacé par deux colonnes de `stations`. La section 7 est à jour.
> 8. ~~**Écrans visés**~~ : **tranché le 11 novembre 2026** (ELS-64). Le PRD ne disait pas sur quels écrans tourne Elsewhere : c'est une application web responsive, pour mobile et desktop, avec une seule base de code. Voir les sections 4 et 7. Les contraintes de l'audio sur mobile sont traitées dans ELS-65.

Auteur : Gabriel. Version 1, 30 octobre 2026. Statut : brouillon à valider.

## 1. Contexte et objectif

Elsewhere donne accès aux radios du monde entier, en montrant ce qui passe en ce moment dans un lieu ou dans un genre musical. Le projet d'équipe est présenté à la soutenance Jedha du 14 décembre 2026, en une courte présentation de 5 minutes.

Ce document décrit **ma version solo**, codée seule de bout en bout, qui servira de projet pour le titre professionnel **Concepteur développeur d'applications (RNCP37873, 3 blocs)**. Elle reprend le concept, les personas et les user stories de l'équipe, mais aucune ligne de code commun.

Double objectif :

- démontrer chaque compétence du référentiel CDA avec un code que je peux expliquer intégralement ;
- livrer une application sobre, cohérente et réellement utilisable.

Passage visé : première quinzaine de mars 2027, sous réserve des sessions de jury proposées par Jedha.

## 2. Problème utilisateur

Écouter une radio étrangère aujourd'hui, c'est écouter à l'aveugle. On ne sait pas ce qui passe avant d'avoir lancé le flux, les genres des annuaires sont imprécis, et un morceau qui plaît disparaît sans laisser de trace. Les algorithmes de streaming, eux, resservent ce qu'on connaît déjà.

## 3. Personas

### Julien, l'explorateur (principal)

36 ans, développeur à Lyon, sans lien personnel avec les lieux qu'il explore. Il cherche un fond sonore qui le surprenne, en télétravail ou le week-end en cuisinant. Il entre par un **thème** (cumbia, highlife, rock turc) ou par un lieu aperçu dans un film.

- **Frustrations :** les algorithmes tournent en rond, Radio Garden relève du hasard, les genres des annuaires sont imprécis.
- **Objectifs :** trouver en deux minutes une station qui joue son thème maintenant, comprendre ce qu'il entend, réécouter un titre ailleurs.
- **Refuse :** une appli qui invente, ou qui impose un compte pour essayer.
- **Moment « waouh » :** il choisit « highlife » et voit trois stations d'Accra et de Lagos qui en jouent en ce moment.

### Aminata, la reliée (secondaire)

42 ans, infirmière à Nantes, née à Dakar. Le soir, après le coucher des enfants, elle a 20 à 30 minutes et une envie de Dakar. Elle entre par un **lieu** : elle sait où elle veut aller.

- **Frustrations :** elle ne sait pas ce qui passe avant d'écouter, et elle perd les morceaux qui lui plaisent.
- **Objectifs :** tomber vite sur une musique qui sonne « chez elle », garder une trace de ces moments.
- **Refuse :** qu'on lui demande d'où elle vient, ou de créer un compte avant d'avoir entendu quoi que ce soit.
- **Moment « waouh » :** elle ouvre Dakar, voit sept radios en direct avec leurs morceaux en cours, touche une station et le son arrive.

**Règle d'arbitrage :** en cas de conflit entre les deux personas, Julien passe d'abord.

## 4. Principes produit

- On écoute **sans compte**. Le compte n'est demandé qu'au moment de garder quelque chose.
- **Jamais de faux titre.** Si une station ne diffuse pas ses métadonnées, elle est affichée comme « titre indisponible ».
- On ne demande jamais à l'utilisateur pourquoi il écoute ni d'où il vient.
- Les données personnelles restent à l'utilisateur : export et suppression possibles.
- **Mobile et desktop.** Elsewhere est une application web qui s'utilise aussi bien sur téléphone que sur ordinateur. La mise en page est pensée d'abord pour le petit écran, puis élargie.

## 5. Périmètre fonctionnel

Les identifiants J et A renvoient aux user stories de l'équipe (page Notion « Personas et user stories »). Les fonctionnalités F sont propres à ma version solo.

### Must — socle à livrer en priorité

| # | Fonctionnalité | Stories liées | Critères d'acceptation principaux |
| --- | --- | --- | --- |
| F1 | Parcourir les lieux et ouvrir le tableau du direct | J1, A1 | Lieux listés avec heure locale et nombre de radios en direct. Sans compte. Titre en cours relevé il y a moins de 5 min, sinon « titre indisponible ». |
| F2 | Entrer par un thème | J2 | Liste fermée de thèmes. Stations de plusieurs lieux. Thème vide : message honnête et thème voisin proposé. |
| F3 | Écouter une station et passer à la suivante | J3, A2 | Son rapide. « Radio suivante » reste dans le thème ou le lieu d'entrée. Flux en panne : message clair et station suivante proposée. |
| F4 | Créer un compte et se connecter | J6, A3 | Inscription par e-mail et mot de passe. Mot de passe haché. Sessions sécurisées. |
| F5 | Garder un moment (favori horodaté) | J6, A3 | Lieu, station, heure locale, titre s'il est lisible, thème d'entrée s'il existe. Sans compte : création du compte puis moment conservé sans ressaisie. |
| F6 | Historique d'écoute et passeport par pays | A4 | Moments rangés par pays, du plus récent au plus ancien. Privé par défaut. Permet de retrouver un titre entendu il y a sept jours. |
| F7 | Consentement, export et suppression des données | A7 | Export complet en un fichier. Suppression du compte et de toutes ses données. |

### Should — ajouts qui complètent le référentiel

| # | Fonctionnalité | Intérêt pour la certification |
| --- | --- | --- |
| F8 | **Listes personnalisées** (« jazz du monde », « réveil ») | Relation plusieurs à plusieurs entre listes et stations. Règle d'accès : personne ne voit ni ne modifie la liste d'un autre. |
| F9 | **Cache des stations**, rafraîchi chaque nuit depuis l'annuaire externe | Récupération, nettoyage et mise à jour de données externes par une tâche planifiée. L'appli tient même si l'annuaire tombe. |
| F10 | **Rôles et espace administrateur** | Les utilisateurs signalent une station morte ; l'admin masque ou réactive. L'API vérifie le rôle à chaque action. |
| F11 | Raccourcis vers les lieux et thèmes déjà explorés | J7, A8 |
| F12 | Lien « Chercher ce titre » vers YouTube ou Spotify | J5. Bouton absent si le titre est illisible. |

### User stories complémentaires (version solo)

Les stories J et A ne couvrent ni les listes (F8), ni le cache (F9), ni l'admin (F10), ni l'API documentée. Elles laissent aussi des trous sur le compte (F4) et les données (F7). Les stories C comblent ces trous.

| # | Fonctionnalité | En tant que… je veux… afin de… | Critères d'acceptation | Priorité |
| --- | --- | --- | --- | --- |
| C1 | F4 | En tant que membre, je veux me déconnecter et réinitialiser mon mot de passe par e-mail, afin de ne jamais perdre l'accès à mes moments. | Lien de réinitialisation à usage unique, expiré après 1 h. Déconnexion qui invalide la session côté serveur. | Must |
| C2 | F4, F7 | En tant que nouveau membre, je veux voir et accepter clairement l'usage de mes données à l'inscription, afin de savoir ce qui est gardé. | Case de consentement non pré-cochée. Date du consentement enregistrée. Aucune question sur l'origine. | Must |
| C3 | F7 | En tant que membre, je veux modifier mon e-mail et mon mot de passe, afin de garder un compte à jour. | Mot de passe actuel demandé avant tout changement. | Should |
| C4 | F8 | En tant que membre, je veux créer, renommer et supprimer une liste de stations, afin de retrouver mes ambiances. | Nom obligatoire et unique pour un même membre. Suppression avec confirmation. | Should |
| C5 | F8 | En tant que membre, je veux ajouter une station à une ou plusieurs listes depuis le lecteur, afin de la ranger sans quitter l'écoute. | Une station peut être dans plusieurs listes. Pas de doublon dans une même liste. | Should |
| C6 | F8 | En tant que membre, je veux écouter une liste et passer à la station suivante dans cette liste, afin d'enchaîner mes stations préférées. | « Radio suivante » reste dans la liste. Station masquée par l'admin : sautée avec un message. | Should |
| C7 | F8 | En tant que membre, je veux que personne d'autre ne puisse voir ni modifier mes listes, afin de garder mes goûts privés. | Toute requête sur la liste d'un autre membre renvoie un refus (403), testé automatiquement. | Should |
| C8 | F10 | En tant qu'auditeur, je veux signaler une station qui ne marche pas, afin qu'elle soit corrigée. | Un signalement par station et par membre. Motif à choisir dans une liste courte. | Should |
| C9 | F10 | En tant qu'administrateur, je veux voir les stations signalées et les masquer ou les réactiver, afin de garder un catalogue fiable. | Liste triée par nombre de signalements. Action tracée avec date et auteur. Accès refusé à un membre sans le rôle admin. | Should |
| C10 | F9 | En tant qu'administrateur, je veux que le catalogue des stations soit mis à jour chaque nuit, afin que les nouvelles stations apparaissent et que les mortes disparaissent. | Tâche planifiée. Journal du nombre de stations ajoutées, modifiées et retirées. Une station masquée par l'admin le reste. | Should |
| C11 | F9 | En tant qu'auditeur, je veux que l'appli fonctionne même si l'annuaire externe est en panne, afin de ne pas tomber sur une page vide. | Le front ne lit que le cache. Annuaire injoignable : dernier cache conservé, erreur journalisée. | Should |
| C12 | API | En tant que développeur, je veux une API documentée avec des entrées validées, afin de faire évoluer l'appli sans casser l'existant. | Chaque route est décrite (OpenAPI). Données invalides refusées avec une erreur claire (400). Requêtes paramétrées contre les injections. | Must |
| C13 | Qualité | En tant que développeur, je veux que les tests passent automatiquement avant chaque déploiement, afin de ne jamais mettre en ligne une version cassée. | Tests lancés à chaque push. Déploiement bloqué si un test échoue. Retour arrière possible vers la version précédente. | Must |

### Hors périmètre de la version solo

Guide du lieu, chatbot avec RAG (J4) — demandé par Jedha pour la soutenance d'équipe du 14 décembre, non exigé par le référentiel CDA ; option si le temps le permet. Récapitulatif hebdomadaire par e-mail (J8, A5), badge « un de vos artistes passe » (A6), tampons du passeport (A9), partage public (J10), abonnement (A10), lieu de la semaine (J9). Ces fonctionnalités restent dans le projet d'équipe ; elles pourront être ajoutées après la certification.

## 6. Hypothèse critique : les métadonnées

L'historique des titres repose sur une hypothèse non vérifiée : les flux radio diffusent le titre en cours. Beaucoup de stations ne le font pas.

- **Test à faire avant le 14 décembre :** relever une vingtaine de stations variées, dans plusieurs lieux, et mesurer combien diffusent artiste et titre.
- **Plan B :** si la proportion est faible, l'historique enregistre les stations écoutées avec lieu et horaire, et le titre seulement quand il est disponible. Le principe « jamais de faux titre » reste valable.

## 7. Architecture technique

| Couche | Choix | Raison |
| --- | --- | --- |
| Front-end | React avec Vite, application web responsive (mobile et desktop) | Vu en cours Jedha, un seul langage avec le back. Une seule base de code pour tous les écrans, sans application mobile native. |
| Back-end | Node.js avec Express | Vu en cours Jedha, supports de révision disponibles. |
| Base de données | PostgreSQL, hébergée chez Supabase | Outil déjà connu. **Supabase sert uniquement de base** : l'API, l'authentification et les règles d'accès sont codées dans mon back-end, pour que le jury voie mon travail. |
| Tests | Tests automatisés de l'API | Priorité aux tests de sécurité : accès refusé sans connexion, accès refusé à la liste d'un autre, accès admin refusé à un utilisateur. |
| Déploiement | Déploiement automatique à chaque modification de la branche principale, avec intégration continue | Mis en place dès la première semaine de janvier, sur une version vide. |

**Organisation du back-end en couches :** routes, puis contrôleurs, puis services (logique métier), puis accès aux données. C'est la structure attendue par le bloc « application organisée en couches ».

### Modèle de données envisagé

- **users** : compte, e-mail, mot de passe haché, rôle (utilisateur ou admin).
- **places** : lieux, pays, fuseau horaire.
- **stations** : stations en cache, lieu, URL du flux, statut (active, masquée), dernier titre lu et heure de cette lecture.
- **themes** et **station\_themes** : thèmes et liaison avec les stations.
- **moments** : moments gardés par un utilisateur.
- **lists** et **list\_stations** : listes personnalisées et leur contenu.
- **reports** : signalements de stations en panne.

Cela fait 9 tables liées, avec deux relations plusieurs à plusieurs (`station_themes` et `list_stations`), largement plus que les quatre tables liées attendues.

*Arbitrage du 11 novembre 2026 (ELS-63)* : la table `track_plays` prévue au départ est retirée. Aucune fonctionnalité n'utilise un historique complet des titres : le tableau du direct (F1) n'a besoin que du dernier titre lu de moins de 5 minutes, porté par deux colonnes de `stations`, et le titre qu'un utilisateur veut retrouver est copié dans son moment (F5, F6). Les tables techniques de session et de réinitialisation du mot de passe (C1) seront décidées avec l'authentification (ELS-17).

## 8. Couverture du référentiel CDA

| Bloc | Ce qu'il faut démontrer | Où je le démontre |
| --- | --- | --- |
| 1. Développer une application sécurisée | Interfaces utilisateur, composants métier, gestion de projet, sécurité | Front React (F1 à F3, F6, F8), authentification (F4), validation des entrées, droits par utilisateur (F8) et par rôle (F10), données personnelles (F7) |
| 2. Concevoir et développer une application sécurisée organisée en couches | Analyse des besoins, maquettes, modélisation de la base, accès aux données, composants métier | Personas et user stories, modèle de données (section 7), API Express en couches, cache et tâche planifiée (F9) |
| 3. Préparer le déploiement d'une application sécurisée | Plan de tests, environnement de déploiement, mise en production continue | Tests automatisés de l'API, intégration continue, déploiement automatique, documentation de mise en production |

À vérifier dans la page Notion « Comment les projets répondent aux critères du jury (CDA) » : back-end à soi, quatre tables liées, agent, intégration continue, environnements de prévisualisation, retour arrière. **Point ouvert : l'agent.** Si le jury l'exige, il faudra réintroduire une forme simple du guide IA (J4). Décision prise : l'agent RAG relève de la soutenance Jedha, pas du RNCP ; il reste hors périmètre de la version solo.

## 9. Ordre de développement

1. API avec comptes, moments et historique (F4 à F7), branchée sur le cache minimal des stations.
2. Tableau du direct, thèmes et lecture (F1 à F3).
3. Listes personnalisées (F8).
4. Cache complet avec tâche nocturne (F9).
5. Espace admin (F10), en dernier.

Si le temps manque, l'application reste cohérente à chaque étape.

## 10. Calendrier

| Période | Objectif |
| --- | --- |
| Jusqu'au 14 décembre | Soutenance d'équipe. En parallèle : test des métadonnées, maquettes, modèle de données. |
| 15 décembre → 4 janvier | Pause. Bonus éventuel : relire le référentiel. |
| 5 janvier → 8 février | Développement, avec tests et déploiement continus. Gel du code le 8 février. |
| 9 → 22 février | Dossier de projet et dossier professionnel. |
| 23 février → début mars | Révisions par compétence et jurys blancs. |
| Première quinzaine de mars | Passage du titre. |

## 11. Questions ouvertes

- Dates des sessions de jury et date limite de dépôt des dossiers.
- Confirmer auprès de Jedha que l'agent n'est pas exigé pour le passage RNCP.
- Proportion réelle de stations qui diffusent leurs métadonnées.
- Hébergeur du back-end et du front-end.
