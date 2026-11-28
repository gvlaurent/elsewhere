# ADR-0002 : les tests de base tournent sur Supabase, dans un schéma jetable

Date : 24 novembre 2026 (ELS-13). Statut : accepté.

## Contexte

La couche d'accès aux données doit être testée sur un vrai PostgreSQL : c'est la seule façon de prouver qu'une requête est paramétrée, ou qu'une contrainte refuse une donnée incohérente. Les tests ne doivent pourtant jamais abîmer les vraies données.

## Décision

Les tests utilisent la base Supabase de `DATABASE_URL`. Chaque fichier de test crée un **schéma** au nom tiré au hasard (`test_3f9a…`, un espace de noms séparé dans la même base), y joue toutes les migrations, puis l'efface à la fin, même en cas d'échec. L'outil est `api/src/db/start-database-for-tests.js`.

Sans `DATABASE_URL`, ces tests sont **sautés** avec un message, et les autres tournent normalement.

## Options écartées

- **PostgreSQL installé en local** : plus rapide et hors ligne, mais il faut le maintenir à la même version que Supabase et y créer un compte. Gabriel a préféré ne gérer qu'une seule base.
- **Une transaction annulée à la fin de chaque test** : plus légère, mais elle ne teste pas les migrations elles-mêmes, et une fonction qui ouvre sa propre transaction casserait l'isolement.

## Conséquences

- Les migrations sont rejouées de zéro à chaque lancement : une migration cassée fait échouer les tests avant d'atteindre la vraie base.
- Les tests de base demandent Internet et sont plus lents (quelques secondes).
- Il faut se connecter en mode « session » de Supabase (port 5432) : le mode « transaction » (port 6543) ne garde pas le réglage `search_path` qui dirige les requêtes vers le schéma jetable.
- L'intégration continue (ELS-14) devra recevoir `DATABASE_URL` et le certificat en secrets, ou bien sautera ces tests : à trancher dans ce ticket.
