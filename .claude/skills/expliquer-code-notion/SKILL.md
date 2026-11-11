---
name: expliquer-code-notion
description: Expliquer ligne par ligne, en français, un fichier de code Elsewhere validé, dans sa sous-page Notion « Code expliqué ligne par ligne », puis vérifier que Gabriel a compris par des questions sans regarder. À utiliser dès qu'un code est validé (tests verts, relecture terminée), quand Gabriel demande d'expliquer un fichier, ou pour une révision des notions « à revoir ».
---

# Expliquer un code validé dans Notion, et vérifier qu'il est compris

Objectif : que Gabriel sache lire, expliquer et modifier chaque ligne de son code devant le jury. Une explication écrite ne prouve pas la compréhension : chaque explication se termine donc par une vérification sans regarder. Les commentaires du code restent courts (règle de `CLAUDE.md`) ; l'explication détaillée vit dans Notion.

## Quand l'utiliser

- Quand un code est **validé** : il marche, les tests passent, la relecture est terminée (avant ou juste après la fusion de la PR).
- Quand Gabriel demande d'expliquer un fichier précis.
- Jamais sur du code en cours : un morceau pas encore validé est signalé « 🏗️ à écrire », avec une phrase sur ce qu'il fera.

## Où écrire

- Page parente : « Code expliqué ligne par ligne » — https://app.notion.com/p/4047c7730ade81998062e38b43a02980
- **Une sous-page par fichier.** Titre : `<chemin du fichier> — <son rôle en quelques mots>`, par exemple `api/services/station-service.js — le service des stations`. Le chemin évite les doublons (plusieurs `index.js`).
- Si la sous-page existe, la mettre à jour. Sinon, la créer et l'ajouter à la liste « Fichiers » de la page parente.
- Les pages du prototype (`index.html`, `style.css`, `script.js`) servent de **modèle de format** : les lire avant d'écrire.

## Étapes

1. **Lire le fichier tel qu'il est dans le dépôt**, à la version validée. Ne jamais réécrire le code de mémoire.
2. **Découper en blocs logiques** (imports, une fonction, une route, une requête SQL…).
3. **Vérifier ce qui est déjà expliqué** dans les autres sous-pages, pour ne pas répéter une notion déjà vue : renvoyer vers la page où elle est expliquée.
4. **Rédiger la sous-page** selon le format ci-dessous.
5. **Montrer à Gabriel** la liste des blocs et les notions nouvelles avant d'écrire une page entièrement nouvelle ou de réécrire fortement une page existante.
6. **Écrire dans Notion**, puis donner le lien de la page.
7. **Vérifier la compréhension** (section suivante), avant de considérer la tâche terminée.

## Format de la sous-page

1. **Encadré vert en tête** :
   - « Dernière validation : <date> » ;
   - en une phrase, le rôle du fichier dans l'architecture (route, contrôleur, service, accès aux données, interface React, configuration) ;
   - le ticket Linear (ELS-…) et la pull request concernés.
2. **« Vocabulaire de base »** : seulement les notions nouvelles par rapport aux pages existantes.
3. **Une section par bloc**, titrée `Lignes X-Y : <ce que fait le bloc>` :
   - le code exactement comme dans le fichier, avec ses numéros de ligne, dans un bloc de code au bon langage ;
   - une puce par ligne ou par petit groupe de lignes : ce que fait chaque mot, avec une image simple quand elle aide (une boîte nommée, une recette, une promesse) ;
   - une ligne **« En une phrase »** pour les blocs importants ;
   - la mention **« écrit par Gabriel »** sur les blocs qu'il a écrits lui-même.
4. **Points sensibles signalés explicitement** quand ils apparaissent : asynchrone (`async`, `await`, promesses), sécurité (validation des entrées, droits d'accès, mots de passe hachés, requêtes paramétrées), SQL.

## Règles

- **Aucun secret dans Notion** : une clé, un mot de passe ou une adresse contenant un jeton est remplacé par `<masqué>`.
- **Numéros de ligne exacts** : ils correspondent à la version validée. Si le fichier change, la page est recalée à la prochaine validation.
- **Ne pas expliquer** les fichiers générés (`package-lock.json`, `dist/`) ni les configurations triviales, sauf demande de Gabriel.
- **Gabriel n'est pas ingénieur** : employer les vrais termes techniques, définis à leur première apparition, sans appauvrir le fond.
- **Demander confirmation** avant de supprimer ou de déplacer une page Notion (règle de `CLAUDE.md`).

## Vérifier la compréhension (après chaque explication)

Une notion est acquise quand Gabriel peut la restituer, l'appliquer et la modifier **sans regarder** l'explication. Lui demander de fermer la page Notion, puis poser les questions **une par une**, en attendant sa réponse avant de donner la correction.

1. **Prédire** (toujours) : montrer une ou deux lignes du fichier et demander ce qu'elles font, ou ce que vaut une variable à un moment précis.
2. **Réexpliquer** (toujours) : demander d'expliquer un bloc avec ses propres mots, comme devant le jury. Relever ce qui est flou, imprécis ou faux, sans le reformuler à sa place tout de suite : lui laisser une seconde chance.
3. **Modifier** (seulement pour les blocs centraux pour le jury : authentification, droits d'accès, validation des entrées, requêtes SQL, asynchrone) : proposer un petit changement à écrire lui-même, par exemple « fais en sorte que la route refuse un identifiant négatif ». Relire son code, ne pas l'écrire à sa place.

Adapter la charge au temps disponible : pour un fichier secondaire, la question 1 suffit.

Ensuite :

- **Réponses justes** : la notion est vérifiée le jour même.
- **Réponse fausse ou hésitante** : réexpliquer autrement (autre image, autre exemple), puis reposer une question différente. Ajouter dans la sous-page, à côté du bloc, la mention « ⚠️ à revoir : <la notion en quelques mots> ».

## Révision espacée

Une notion comprise le jour même s'oublie en quelques semaines ; le passage du RNCP est en mars 2027.

- Quand Gabriel demande une révision, ou en début de session si des notions sont « à revoir », lister les lignes « Apprentissage » du Journal Elsewhere au statut « Ouvert » et les sous-pages marquées ⚠️.
- Poser les mêmes types de questions, sans relire la page avant. Viser une révision **quelques jours après**, puis **une semaine après** l'explication.
- Réussie à une semaine : passer la ligne du Journal en « Fait » et retirer la mention ⚠️. Ratée : la garder « Ouvert » et réexpliquer.

## Après

- Pour chaque notion vraiment nouvelle, **proposer** une ligne au Journal Elsewhere (Type « Apprentissage », Domaine « Apprentissage », Source « Claude Code », Statut « Ouvert », Lien vers la sous-page, Détail : la notion et le résultat de la vérification du jour), puis l'écrire après accord de Gabriel.
- Rappeler la case de la Definition of Done sur l'explication du code dans la PR : elle ne se coche que si la vérification a été faite.
