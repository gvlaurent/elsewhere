-- Migration 001 : schéma initial d'Elsewhere, 9 tables (ELS-13).
-- Modèle conceptuel, modèle logique et dictionnaire des données :
-- docs/donnees.md. Ce fichier ne se modifie plus une fois appliqué ;
-- tout changement passe par une nouvelle migration (002_…).
--
-- Conventions :
-- - clé primaire « id » en entier auto-incrémenté (GENERATED ALWAYS AS
--   IDENTITY : la base choisit le numéro, l'API ne peut pas l'imposer) ;
-- - dates en timestamptz (instant précis, stocké en UTC) ;
-- - les listes de valeurs fermées (rôle, statut, motif) sont des CHECK :
--   la base refuse toute autre valeur, même si l'API se trompait.

-- Lieux : une ville ou une région, avec son pays et son fuseau horaire,
-- pour afficher l'heure locale (F1).
CREATE TABLE places (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> ''),
  country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),  -- ISO 3166-1, ex. NG
  country_name text NOT NULL,
  timezone text NOT NULL,                                             -- IANA, ex. Africa/Lagos
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, name)
);

-- Comptes. Le mot de passe n'est jamais stocké, seulement son hash.
CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL CHECK (position('@' IN email) > 1),
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  consent_at timestamptz NOT NULL,          -- date du consentement (C2)
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Un e-mail ne sert qu'une fois, quelle que soit la casse :
-- Julien@x.com et julien@x.com sont le même compte.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- Stations en cache, recopiées de Radio Browser chaque nuit (F9).
CREATE TABLE stations (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id uuid NOT NULL UNIQUE,         -- stationuuid de Radio Browser
  place_id integer NOT NULL REFERENCES places (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (btrim(name) <> ''),
  stream_url text NOT NULL,
  homepage_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  -- Trace de la dernière décision d'un admin (C9) : quand, et par qui.
  -- Le compte supprimé laisse la date, l'auteur devient inconnu (NULL).
  status_changed_at timestamptz,
  status_changed_by integer REFERENCES users (id) ON DELETE SET NULL,
  -- Dernier titre classé lisible et l'heure de cette lecture (F1). Ils vont
  -- ensemble : un titre sans heure ne permettrait pas de savoir s'il a
  -- moins de 5 minutes. Remplace l'ancienne table track_plays (ELS-63).
  last_title text,
  last_title_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((last_title IS NULL) = (last_title_read_at IS NULL))
);
CREATE INDEX stations_place_id_idx ON stations (place_id);

-- Déclencheur (trigger) : une fonction que PostgreSQL exécute tout seul,
-- ici juste avant chaque modification d'une station. Il met updated_at à
-- l'heure courante : la date reste juste même si le code qui modifie la
-- station (synchro de nuit, modération) oublie de la changer.
-- « SET search_path = '' » : recommandé par Supabase pour qu'une fonction
-- ne puisse pas être détournée par une table ou une fonction homonyme
-- créée ailleurs ; now() reste trouvée, elle fait partie de PostgreSQL.
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();  -- NEW : la ligne telle qu'elle sera enregistrée
  RETURN NEW;
END;
$$;

CREATE TRIGGER stations_set_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Thèmes : liste fermée (cumbia, highlife…), remplie par migration (F2).
CREATE TABLE themes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- ex. rock-turc, pour les URL
  name text NOT NULL UNIQUE
);

-- Liaison plusieurs à plusieurs : une station a plusieurs thèmes, un thème
-- couvre plusieurs stations. La clé primaire double interdit les doublons.
CREATE TABLE station_themes (
  station_id integer NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  theme_id integer NOT NULL REFERENCES themes (id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, theme_id)
);
-- La clé primaire sert déjà la recherche par station ; cet index sert
-- l'entrée par thème (F2) : « toutes les stations de highlife ».
CREATE INDEX station_themes_theme_id_idx ON station_themes (theme_id);

-- Moments gardés (F5, F6). Ils copient lieu, station, titre et thème :
-- le passeport reste exact même si la station disparaît du cache ou change
-- de nom. Les liens station_id et theme_id passent alors à NULL.
CREATE TABLE moments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  station_id integer REFERENCES stations (id) ON DELETE SET NULL,
  theme_id integer REFERENCES themes (id) ON DELETE SET NULL,
  station_name text NOT NULL,
  place_name text NOT NULL,
  country_code char(2) NOT NULL,
  country_name text NOT NULL,
  theme_name text,                          -- NULL : entré par un lieu, pas par un thème
  track_title text,                         -- NULL : « titre indisponible », jamais inventé
  kept_at timestamptz NOT NULL DEFAULT now(),  -- instant exact, pour trier
  local_time timestamp NOT NULL,            -- heure affichée sur place, sans fuseau
  -- Un moment relié à un thème en garde le nom. L'inverse reste permis :
  -- si le thème disparaît, theme_id passe à NULL et la copie du nom reste.
  CHECK (theme_id IS NULL OR theme_name IS NOT NULL)
);
-- Sert le passeport : les moments d'un membre, du plus récent au plus ancien.
CREATE INDEX moments_user_id_kept_at_idx ON moments (user_id, kept_at DESC);

-- Listes personnalisées (F8), privées à leur membre.
CREATE TABLE lists (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Nom unique pour un même membre, sans tenir compte de la casse ni des
-- espaces autour (C4) : « Réveil », « réveil » et « Réveil » suivi d'une
-- espace sont le même nom. btrim, comme dans la règle CHECK ci-dessus.
-- Cet index sert aussi « les listes d'un membre ».
CREATE UNIQUE INDEX lists_user_id_name_unique ON lists (user_id, lower(btrim(name)));

-- Contenu des listes : plusieurs à plusieurs, sans doublon (C5).
CREATE TABLE list_stations (
  list_id integer NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
  station_id integer NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, station_id)
);

-- Signalements de stations en panne (C8) : un seul par membre et par station.
CREATE TABLE reports (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  station_id integer NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('no_sound', 'not_music', 'bad_quality', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);
-- Sert la page admin : stations triées par nombre de signalements (C9).
CREATE INDEX reports_station_id_idx ON reports (station_id);

-- Sécurité propre à Supabase : son API automatique (PostgREST) expose les
-- tables du schéma public à quiconque a la clé publique du projet. Activer
-- la sécurité par ligne (RLS) sans écrire aucune règle ferme cette porte :
-- cette API ne voit plus rien. Notre API Express se connecte avec le compte
-- propriétaire des tables, que la RLS ne bloque pas.
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
