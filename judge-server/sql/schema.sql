CREATE TABLE IF NOT EXISTS problems (
  id                text PRIMARY KEY,
  title             text NOT NULL,
  platform          text NOT NULL,
  source_url        text,
  mode              text NOT NULL CHECK (mode IN ('stdin', 'function', 'script')),
  languages         text[] NOT NULL DEFAULT ARRAY['python'],
  time_limit_ms     integer NOT NULL DEFAULT 2000,
  memory_limit_mb   integer NOT NULL DEFAULT 256,
  compare_mode      text NOT NULL DEFAULT 'text'
                    CHECK (compare_mode IN ('text', 'json', 'float', 'unordered')),
  active_test_count integer NOT NULL DEFAULT 0,
  full_test_count   integer NOT NULL DEFAULT 0,
  provenance        jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id               uuid PRIMARY KEY,
  problem_id       text REFERENCES problems(id) ON DELETE SET NULL,
  language         text NOT NULL,
  source           text NOT NULL,
  source_sha1      text NOT NULL,
  client_id        text,
  ip_hash          text,
  status           text NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'running', 'done')),
  verdict          text,
  passed           integer NOT NULL DEFAULT 0,
  total            integer NOT NULL DEFAULT 0,
  time_ms          integer,
  memory_kb        integer,
  compile_output   text,
  message          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  finished_at      timestamptz
);

CREATE INDEX IF NOT EXISTS submissions_problem_created_idx
  ON submissions (problem_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_client_created_idx
  ON submissions (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_status_idx
  ON submissions (status);

CREATE TABLE IF NOT EXISTS submission_cases (
  submission_id    uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  seq              integer NOT NULL,
  verdict          text NOT NULL,
  time_ms          integer,
  memory_kb        integer,
  message          text,
  input_excerpt    text,
  expected_excerpt text,
  actual_excerpt   text,
  PRIMARY KEY (submission_id, seq)
);

CREATE TABLE IF NOT EXISTS source_imports (
  id           text PRIMARY KEY,
  dataset      text NOT NULL,
  version      text,
  license      text NOT NULL,
  url          text,
  checksum     text,
  imported_at  timestamptz NOT NULL DEFAULT now(),
  notes        text
);
