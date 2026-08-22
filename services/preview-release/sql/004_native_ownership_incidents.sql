CREATE TABLE IF NOT EXISTS preview_native_ownership_incident (
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  build_id text NOT NULL,
  source_sha text NOT NULL REFERENCES preview_release(source_sha) ON DELETE RESTRICT,
  state text NOT NULL CHECK (state IN ('DETECTED','REJECTED','ADOPTED')),
  reason text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, build_id)
);

CREATE INDEX IF NOT EXISTS preview_native_ownership_incident_source
  ON preview_native_ownership_incident(source_sha, state);
