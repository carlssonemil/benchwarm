-- Benchwarm schema
-- To reset: run the DROP section, then re-run CREATE section.
-- To wipe data only: TRUNCATE match_players, matches, players, seasons, teams CASCADE;

-- ---------------------------------------------------------------------------
-- Drop (reverse dependency order)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS match_players CASCADE;
DROP TABLE IF EXISTS matches        CASCADE;
DROP TABLE IF EXISTS players        CASCADE;
DROP TABLE IF EXISTS seasons        CASCADE;
DROP TABLE IF EXISTS teams          CASCADE;

-- ---------------------------------------------------------------------------
-- Create
-- ---------------------------------------------------------------------------

CREATE TABLE teams (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  slug                TEXT        NOT NULL UNIQUE,
  admin_pin_hash      TEXT        NOT NULL,
  match_size          INTEGER     NOT NULL DEFAULT 10,
  recovery_token_hash TEXT,
  logo_url            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) <= 60),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id  UUID        NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id    UUID        NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  title      TEXT,
  played_at  DATE        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('planned', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE match_players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id           UUID    NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  was_available       BOOLEAN NOT NULL DEFAULT true,
  was_selected        BOOLEAN NOT NULL DEFAULT false,
  bank_entries_at_spin INTEGER NOT NULL DEFAULT 1,
  was_guaranteed      BOOLEAN NOT NULL DEFAULT false,
  was_no_show         BOOLEAN NOT NULL DEFAULT false,
  was_replacement     BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX ON players(team_id);
CREATE INDEX ON seasons(team_id);
CREATE INDEX ON matches(season_id);
CREATE INDEX ON matches(team_id);
CREATE INDEX ON match_players(match_id);
CREATE INDEX ON match_players(player_id);
