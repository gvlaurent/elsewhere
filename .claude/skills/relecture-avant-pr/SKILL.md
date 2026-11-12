---
name: relecture-avant-pr
description: Relire tout le travail d'un ticket Elsewhere avant d'ouvrir la pull request (diff complet, sécurité, tests, conventions, Definition of Done), puis préparer le commit et la description de la PR. À utiliser à la fin du skill nouvelle-fonctionnalite, ou quand Gabriel demande une relecture avant PR.
---

# Relecture avant pull request

Objectif : aucune pull request n'est ouverte sans que tout le diff ait été relu et que chaque case de la Definition of Done soit vérifiée, ou marquée « sans objet » avec sa raison. L'agent prépare et signale ; Gabriel décide.

## Étapes

1. **Identifier le ticket** d'après le nom de la branche (`gvlaurent/els-<numéro>-…`), puis relire ses critères d'acceptation dans Linear. Si la branche ne contient pas d'identifiant ELS, le signaler.
2. **Mesurer le périmètre** :
   - `git fetch origin` (récupérer `main` à jour depuis GitHub : la copie locale de `main` est souvent en retard) ;
   - `git status` (fichiers non commités ou non suivis) ;
   - `git diff origin/main...HEAD --stat` (tout ce que la branche change par rapport à `main` à jour).
   Si la branche contient des commits d'un autre ticket déjà fusionné en squash, le signaler : il faut la reconstruire depuis `origin/main` avant d'ouvrir la PR.
   Signaler tout fichier qui sort du périmètre du ticket.
3. **Relire le diff complet, fichier par fichier**, avec la grille ci-dessous.
4. **Lancer les tests** s'ils existent (`npm test`, ou la commande indiquée dans `package.json`). S'il n'y en a pas encore, le dire, sans prétendre qu'ils passent.
5. **Rendre un rapport** à Gabriel (format ci-dessous). Ne rien corriger sans son accord. Après correction, relancer les tests.
6. **Parcourir la Definition of Done** du modèle `.github/pull_request_template.md`, case par case (voir plus bas).
7. **Préparer le commit et la PR** : messages et description selon `CONTRIBUTING.md`. Ne pousser et n'ouvrir la PR qu'après accord explicite de Gabriel.

## Grille de relecture

- **Fonctionnel** : chaque critère d'acceptation est couvert. Cas limites traités : entrée vide, erreur réseau, flux radio en panne, titre indisponible. Règle produit : jamais de faux titre.
- **Sécurité** :
  - toute entrée est validée côté Express ;
  - les droits d'accès sont vérifiés dans le service, jamais seulement dans l'interface ;
  - les requêtes SQL sont paramétrées ;
  - les mots de passe sont hachés ;
  - aucun secret dans le diff : chercher les formats de clés courants et les adresses contenant un jeton ;
  - `.env.example` est à jour si une variable d'environnement a été ajoutée.
- **Tests** : ils existent, ils traduisent les critères d'acceptation, ils passent.
- **Architecture** : les couches sont respectées (routes → contrôleurs → services → accès aux données). Si le ticket change un statut, une couche, un middleware, une ressource, une table, un service externe ou l'hébergement, `docs/architecture.md` (schémas, statuts, date « État au ») et le schéma du `README.md` sont mis à jour dans la même PR.
- **Conventions** (`CONTRIBUTING.md`) : nommage, commentaires en français en tête de fichier et de fonction, pas de commentaire à chaque ligne, pas de code mort ni de `console.log` de débogage oublié.
- **Interface** (si le ticket en touche une) : libellés des champs, navigation au clavier, contraste, textes alternatifs.

## Format du rapport

Un tableau, du plus grave au moins grave :

| Niveau | Fichier et ligne | Constat | Correction proposée |
| --- | --- | --- | --- |
| Bloquant | … | … | … |
| À corriger | … | … | … |
| Suggestion | … | … | … |

- **Bloquant** : faille de sécurité, critère non couvert, test en échec, secret dans le diff.
- **À corriger** : convention non respectée, cas limite oublié.
- **Suggestion** : amélioration facultative.

Expliquer chaque point en une ou deux phrases simples : Gabriel n'est pas ingénieur, mais il veut comprendre le fond.

## Definition of Done

Pour chaque case du modèle de PR, indiquer : **fait**, **sans objet** (avec la raison) ou **à faire**. Les cas où une case peut être « sans objet » sont fixés dans `CONTRIBUTING.md` (section « Pull requests ») : s'y référer à chaque relecture plutôt que de les déduire. Les deux mentions autorisées sont `(sans objet : documentation uniquement)` et `(sans objet : script d'enquête hors application)`.

- La case « relu par moi-même avant fusion » appartient à Gabriel : ne jamais la cocher ni la déclarer faite à sa place.
- Si le ticket contient du code validé, proposer d'enchaîner avec le skill `expliquer-code-notion` pour la case sur l'explication du code.
- Rappeler la ligne à ajouter au Journal Elsewhere avec le lien de la PR.

## Commit et pull request

- Message : `<type>: <ce que fait le commit> (ELS-<numéro>)`, selon `CONTRIBUTING.md`.
- Description : le modèle de PR rempli ; « Comment vérifier » donne des étapes concrètes.
- Si le ticket demande plusieurs PR, écrire `Part of ELS-<numéro>` dans la description de chaque PR sauf la dernière, pour ne pas clôturer le ticket trop tôt (voir `CONTRIBUTING.md`).
- Un commit écrit par l'agent porte la mention `Co-Authored-By: Claude`.

## Règles

- Jamais de push sur `main`, jamais de force push.
- Ne jamais ouvrir ni fusionner une PR sans l'accord de Gabriel.
