# ELS-7 — Maquettes du MVP et enchaînement des écrans

Maquettes mobiles (390 × 844) du produit minimum présenté à la soutenance Jedha du 14 décembre 2026. Elles traduisent le périmètre Must du PRD (F1 à F7), le guide du lieu demandé par Jedha (J4) et la décision du 10 novembre : Elsewhere ne propose que des radios musicales.

- **Maquettes (Figma)** : https://www.figma.com/design/Xb3pF4tQ0bo3WLuQrk5iLU
- **Schéma de navigation (FigJam)** : https://www.figma.com/board/7qL2rGfQvIQdi2996D029e
- **Point de départ visuel** : `figma/maquette_V3_reference.png` (palette crème et bleu, carte du monde). Le nom « Radio Monde » y est remplacé par « Elsewhere ».

## Écrans

| # | Écran | Fonctionnalité | Ce qu'il montre |
| --- | --- | --- | --- |
| 01 | Lieux (accueil) | F1, A1 | Lieux curés avec heure locale et nombre de radios en direct, recherche d'un lieu, sans compte |
| 02 | Tableau du direct — Dakar | F1 | Titre en cours de chaque station, ou « titre indisponible » écrit en toutes lettres |
| 03 | Thèmes | F2 | Liste fermée de thèmes, avec le nombre de radios qui les jouent maintenant |
| 04 | Thème — Highlife | F2, F3 | Stations de plusieurs lieux ; « radio suivante » reste dans le thème ; mini-lecteur |
| 05 | Thème vide — Fado | F2 | Message honnête et thème voisin proposé, jamais une station au hasard |
| 06 | Lecteur | F3, F5, F12 | Station, lieu, heure locale, titre relevé et son âge, radio suivante, garder ce moment, chercher ce titre |
| 07 | Lecteur — flux en panne | F3, C8 | Cause expliquée, radio suivante du même lieu, réessayer, signaler |
| 08 | Garder ce moment — créer un compte | F4, F5, C2 | Le moment est gardé sans ressaisie ; consentement non pré-coché |
| 09 | Connexion | F4, C1 | Connexion, mot de passe oublié |
| 10 | Passeport | F6 | Moments rangés par pays, privé par défaut |
| 11 | Passeport — un pays | F6 | Moments du plus récent au plus ancien, titre ou « titre indisponible », thème d'entrée |
| 12 | Compte et données | F7, C3 | Export, modification, déconnexion, suppression confirmée par e-mail |
| 13 | Guide du lieu — Dakar | J4 (Jedha) | Réponse sourcée par une fiche de curateur ; « je ne sais pas » hors fiches |

Le fichier contient aussi les **composants** réutilisés par tous les écrans (boutons, puce de thème, lignes de station, mini-lecteur, barre d'onglets) et les **couleurs nommées** (variables Figma `Elsewhere`), qui deviendront les variables CSS de l'interface React.

Hors maquettes, car hors périmètre du produit minimum : listes personnalisées (F8), espace administrateur (F10), raccourcis (F11).

## Accessibilité (RGAA)

Les choix sont aussi notés dans le cadre « Accessibilité (RGAA) » du fichier Figma.

- **Contrastes** (critère 3.2) : texte principal `#1B2430` sur fond `#FCFAF6`, environ 15:1 ; texte secondaire `#55606E`, environ 6:1 ; blanc sur bouton `#1D5FD1`, environ 5,8:1 ; la combinaison la plus faible, bleu sur bleu clair (puces de thème), est à 4,9:1. Tout dépasse 4,5:1 (calcul selon la formule WCAG).
- **Pas d'information par la couleur seule** (critère 3.1) : « Titre indisponible » est écrit, avec une icône, en plus du gris.
- **Zones tactiles** d'au moins 44 × 44 px : boutons, onglets, lecture, retour, case de consentement.
- **Icônes accompagnées d'un libellé visible** ; dans le code, les boutons-icônes auront un nom accessible (`aria-label`).
- **Formulaires** (critère 11.1) : étiquette visible au-dessus de chaque champ, aide sous le champ mot de passe.
- **Messages d'erreur** qui donnent la cause et une action (flux en panne, thème vide).
- **Pas de lecture automatique** (critère 4.10) : le son ne démarre qu'après une action.

## Limites

- Les stations, titres et chiffres sont des **exemples** : ce ne sont pas des relevés réels.
- Les contrastes sont calculés sur les couleurs choisies ; ils seront revérifiés sur l'interface codée.
- Version mobile seulement. La version large (ordinateur) sera traitée avec l'interface React.
