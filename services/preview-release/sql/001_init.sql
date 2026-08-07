CREATE TABLE IF NOT EXISTS preview_release (
  source_sha text PRIMARY KEY CHECK (source_sha ~ '^[0-9a-f]{40}$'),
  previous_sha text CHECK (previous_sha IS NULL OR previous_sha ~ '^[0-9a-f]{40}$'),
  mode text NOT NULL CHECK (mode IN ('dry-run','active')),
  classification text,
  validation_state text,
  state text NOT NULL,
  render_deploy_id text,
  render_deployed_sha text,
  render_health jsonb,
  eas_update_id text,
  eas_build_id text,
  ios_build_number text,
  eas_submission_id text,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  lock_owner text,
  lock_expires_at timestamptz,
  started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failure_reason text,
  recovery_action text,
  report_url text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS preview_release_action (
  id bigserial PRIMARY KEY,
  source_sha text NOT NULL REFERENCES preview_release(source_sha) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('WEB','OTA','IOS_BUILD','ANDROID_BUILD','IOS_SUBMISSION','REPORT')),
  identity_key text NOT NULL,
  remote_id text,
  state text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, identity_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS preview_release_one_render_per_sha ON preview_release_action(source_sha) WHERE kind='WEB';
CREATE UNIQUE INDEX IF NOT EXISTS preview_release_one_ota_per_sha ON preview_release_action(source_sha) WHERE kind='OTA';
CREATE UNIQUE INDEX IF NOT EXISTS preview_release_one_ios_build_per_sha ON preview_release_action(source_sha) WHERE kind='IOS_BUILD';
CREATE UNIQUE INDEX IF NOT EXISTS preview_release_one_submission_per_build ON preview_release_action(identity_key) WHERE kind='IOS_SUBMISSION';
