---
name: fin-de-session
description: Clôturer une session de travail sur Elsewhere en cinq minutes : faire l'état des lieux, mettre à jour les tickets Linear, proposer les lignes du Journal Elsewhere, signaler les retards et préparer la reprise. À utiliser quand Gabriel dit qu'il arrête, ou à la fin d'une session de travail.
---

# Fin de session

Objectif : ne rien perdre, laisser une trace utile au Dossier RNCP, et savoir exactement par quoi reprendre. La fin de session doit tenir en cinq minutes : être bref.

## Étapes

1. **État des lieux** :
   - worktrees existants : `git worktree list`, puis `git status` dans chacun. Signaler ceux dont la branche est déjà fusionnée (`gh pr list --state merged`) et proposer de les supprimer, après accord ;
   - commits du jour, toutes branches confondues : `git log --all --since=midnight --oneline` ;
   - pull requests ouvertes : `gh pr list` ;
   - tickets Linear modifiés ou en cours.
2. **Ne rien perdre** : s'il reste des modifications non commitées, proposer un commit de travail en cours sur la branche du ticket (jamais sur `main`), ou noter précisément ce qui reste en suspens.
3. **Tickets Linear** — proposer :
   - les changements de statut (In Progress, In Review ; Done seulement si la PR est fusionnée) ;
   - un commentaire d'avancement sur chaque ticket en cours : fait, reste à faire, blocage ;
   - pour un ticket dont l'échéance est dépassée : le signaler et proposer une décision (reporter, réduire, abandonner), à consigner au Journal.
   Rappel : la fusion d'une PR clôt automatiquement son ticket. Si le ticket demandait plusieurs PR, proposer de le rouvrir.
4. **Journal Elsewhere** (base Notion « Journal Elsewhere » : https://app.notion.com/p/316039cb570e4230bec18ffc91805be2) — proposer une ligne par fait, jamais un résumé fourre-tout :
   - **Livrable** : PR ouverte ou fusionnée, avec son lien ;
   - **Décision** : un choix qui change quelque chose, avec sa raison. Si elle remplace une décision précédente, passer l'ancienne ligne en « Remplacé » (ne jamais l'effacer) ;
   - **Apprentissage** : notion nouvelle, statut « Ouvert » tant qu'elle n'est pas vérifiée (voir le skill `expliquer-code-notion`) ;
   - **Question ouverte** : ce qui reste à trancher.
   Champs : Titre, Date, Type, Domaine, Source (« Claude Code »), Statut, Lien, Détail.
5. **Le dimanche**, proposer aussi la ligne « Bilan semaine N » : livré, glissé, décision pour la semaine suivante.
6. **Révision** : lister les notions « Apprentissage » au statut « Ouvert » à revoir à la prochaine session.
7. **Préparer la reprise**, en trois lignes au plus :
   - le prochain ticket, choisi selon le jalon en cours et les échéances ;
   - la première action concrète ;
   - le point bloquant éventuel.
   Proposer de l'écrire en commentaire sur ce ticket dans Linear.
8. **Écrire dans Linear et Notion seulement après l'accord de Gabriel**, en une seule fois.

## Règles

- Ne jamais effacer une ligne du Journal.
- Aucun secret dans Notion ni dans Linear.
- Ne pas traiter un arrêt comme un échec : constater, décider, reprendre.
