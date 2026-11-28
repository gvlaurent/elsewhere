-- Migration 002 : sessions de connexion (ELS-17, ADR-0004).
-- Une ligne par appareil connecté. Ce fichier ne se modifie plus une fois
-- appliqué ; tout changement passe par une nouvelle migration (003_…).

-- Le navigateur garde un jeton secret dans un cookie ; la base n'en garde
-- que l'empreinte (SHA-256). Une fuite de la base ne donne donc aucun jeton
-- utilisable pour se faire passer pour un membre.
CREATE TABLE sessions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Supprimer un compte supprime ses sessions (F7) : plus personne n'est
  -- connecté à un compte qui n'existe plus.
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 64 caractères hexadécimaux : la forme d'une empreinte SHA-256. La base
  -- refuse ainsi d'enregistrer par erreur le jeton lui-même.
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
-- Sert le ménage des sessions expirées d'un membre, à chaque connexion.
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- Comme les 9 tables de 001 : fermée à l'API automatique de Supabase.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
