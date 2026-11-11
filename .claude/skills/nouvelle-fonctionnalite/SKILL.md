---
name: nouvelle-fonctionnalite
description: Coder une user story d'Elsewhere de bout en bout (test d'abord, puis couches route → contrôleur → service → données, puis interface). À utiliser quand Gabriel demande d'implémenter une fonctionnalité ou une story (J, A ou C).
---

# Coder une nouvelle fonctionnalité

## Avant de coder
1. Identifier la story dans `docs/prd.md` et le ticket correspondant dans Linear (projet Elsewhere). Si aucun ticket n'existe, le signaler et proposer de le créer. Si le PRD et le ticket se contredisent, ou si la story touche un « écart connu » listé en tête du PRD, le signaler à Gabriel avant de coder.
2. Reformuler en trois phrases ce que la fonctionnalité doit faire et ses critères d'acceptation. Attendre l'accord de Gabriel.
3. Lister les fichiers qui seront créés ou modifiés, couche par couche.
4. Créer la branche au nom proposé par Linear (`gvlaurent/els-<numéro>-<titre>`), comme le prévoit `CONTRIBUTING.md`.

## Pendant
5. Écrire d'abord les tests qui traduisent les critères d'acceptation, et vérifier qu'ils échouent.
6. Coder dans l'ordre : accès aux données → service → contrôleur → route → interface React.
7. Valider toute entrée côté Express. Vérifier les droits d'accès dans le service, jamais seulement dans l'interface.
8. Si un changement de base est nécessaire, écrire un script de migration SQL versionné.
9. Après chaque couche, expliquer à Gabriel en quelques phrases simples ce qui a été fait et pourquoi.

## Fin
10. Lancer tous les tests ; ils doivent passer.
11. Enchaîner avec le skill `relecture-avant-pr`.

## Cas particuliers
- Si la story sort du périmètre du PRD : s'arrêter et demander une décision, à consigner au Journal.
- Si une solution demande une bibliothèque nouvelle : expliquer pourquoi et demander l'accord avant de l'installer.
