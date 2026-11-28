# ADR-0001 : migrations en SQL pur, appliquées par un script maison

Date : 24 novembre 2026 (ELS-13). Statut : accepté.

## Contexte

La structure de la base doit être versionnée : chaque changement est écrit, relu dans une pull request, et rejouable à l'identique sur Supabase, sur une base de test ou sur un autre poste. Le jury CDA attend une « migration versionnée » et Gabriel doit pouvoir expliquer chaque ligne.

## Décision

Les migrations sont des fichiers SQL numérotés dans `api/src/db/migrations/` (`001_initial_schema.sql`, puis `002_…`). Un script d'une soixantaine de lignes, `api/src/db/migrate.js`, les applique dans l'ordre, chacune dans une transaction, et note celles qui sont passées dans la table `schema_migrations`. On le lance avec `npm run db:migrate`.

Un fichier déjà appliqué ne se modifie jamais : on ajoute une nouvelle migration.

## Options écartées

- **Bibliothèque `node-pg-migrate`** : éprouvée, mais elle écrit le SQL à partir de JavaScript et ajoute une dépendance dont il faudrait expliquer le fonctionnement interne au jury.
- **Un ORM (Prisma, Sequelize…)** : il génère les requêtes et les migrations à notre place. Le jury verrait moins le SQL, qui est justement la compétence à démontrer.
- **Migrations de Supabase (`supabase db push`)** : elles lient le projet à l'outil de Supabase, alors que Supabase ne sert que de base (PRD, section 7).

## Conséquences

- Le SQL est lu tel quel par le jury, sans couche de traduction.
- Pas de retour arrière automatique (« down ») : pour défaire, on écrit une nouvelle migration. C'est suffisant pour un projet solo, et plus sûr que de supprimer des données par un script.
- Deux migrations lancées exactement en même temps sur la même base ne sont pas protégées l'une de l'autre. Le risque est nul tant qu'une seule personne déploie ; à revoir avec le déploiement automatique (ELS-15).
