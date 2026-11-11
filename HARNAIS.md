# Harnais IA d'Elsewhere

Elsewhere se code avec deux assistants IA : **Claude Code** (dans le terminal, via Orca) et **Cursor** (l'éditeur). Le *harnais*, c'est l'ensemble des fichiers qui leur donnent les règles du projet et les façons de travailler, pour qu'ils se comportent de la même manière d'une session à l'autre.

## Principe : une seule source

Les règles et les méthodes sont écrites **une seule fois**, dans les fichiers lus par Claude Code. Cursor ne les recopie pas : il les charge avec la syntaxe `@fichier`. Une règle modifiée dans `CLAUDE.md` ou dans un skill s'applique donc aussitôt aux deux assistants, sans risque de deux versions qui divergent.

| Rôle | Fait foi | Claude Code le lit | Cursor le lit via |
| --- | --- | --- | --- |
| Règles permanentes, stack, commentaires | `CLAUDE.md` | automatiquement | `.cursor/rules/elsewhere.mdc` |
| Conventions et Definition of Done | `CONTRIBUTING.md` | depuis `CLAUDE.md` | `.cursor/rules/elsewhere.mdc` |
| Façon de travailler en binôme | réglages personnels de Gabriel | automatiquement | `.cursor/rules/binome.mdc` |
| Méthodes (coder une story, relire, expliquer…) | `.claude/skills/<nom>/SKILL.md` | skill `<nom>` | commande `/<nom>` dans `.cursor/commands/` |

`binome.mdc` est la seule exception au principe : la façon de travailler de Gabriel vit dans ses réglages personnels de Claude Code, hors du dépôt. Elle est recopiée ici pour que Cursor la connaisse aussi. Si elle change, mettre à jour les deux.

## Contenu

- `.cursor/rules/elsewhere.mdc` : toujours actif. Charge `CLAUDE.md` et `CONTRIBUTING.md`, et rappelle les cinq règles les plus importantes.
- `.cursor/rules/binome.mdc` : toujours actif. Français, mots simples, explication avant et après chaque changement, petits morceaux écrits par Gabriel ; « vite » ou « vibe » pour tout déléguer.
- `.cursor/commands/` : une commande par skill du projet. Taper `/` dans le chat de Cursor pour les voir.

| Commande Cursor | Quand l'utiliser |
| --- | --- |
| `/point-projet` | en début de session ou de semaine |
| `/nouvelle-fonctionnalite` | pour coder une user story |
| `/relecture-avant-pr` | avant chaque pull request |
| `/expliquer-code-notion` | dès qu'un code est validé |
| `/fin-de-session` | à la fin de chaque session |

## Limites

- Plusieurs skills lisent ou écrivent dans **Linear**, **Notion** ou **Orca**. Si Cursor n'a pas accès à ces outils, la commande le signale et donne l'action à faire à la main. Pour ces étapes, Claude Code reste l'outil principal.
- Le harnais ne remplace pas la Definition of Done : la relecture à froid et la fusion restent des gestes de Gabriel.

## Ajouter ou modifier une règle

1. Modifier `CLAUDE.md`, `CONTRIBUTING.md` ou le skill concerné, jamais une copie dans `.cursor/`.
2. Nouveau skill : ajouter sa commande dans `.cursor/commands/<nom>.md` sur le modèle des autres, et une ligne dans le tableau ci-dessus.
3. Comme tout changement, passer par un ticket et une pull request.
