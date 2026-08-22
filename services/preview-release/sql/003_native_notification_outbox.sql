CREATE TABLE IF NOT EXISTS preview_native_notification (
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  build_id text NOT NULL,
  source_sha text NOT NULL REFERENCES preview_release(source_sha) ON DELETE RESTRICT,
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS','FAILED')),
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','RETRYABLE_FAILURE','COMPLETE')),
  recipient_ids jsonb,
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, build_id)
);

CREATE INDEX IF NOT EXISTS preview_native_notification_unresolved
  ON preview_native_notification(next_attempt_at)
  WHERE state IN ('PENDING','RETRYABLE_FAILURE');

-- Existing completed releases were reconciled by the legacy notifier. Record
-- them as resolved; only interrupted releases enter the new durable outbox.
INSERT INTO preview_native_notification (platform, build_id, source_sha, outcome, state)
SELECT CASE build.kind WHEN 'IOS_BUILD' THEN 'ios' ELSE 'android' END,
       build.remote_id, build.source_sha,
       CASE WHEN build.state='FINISHED' THEN 'SUCCESS' ELSE 'FAILED' END,
       CASE WHEN release.state='COMPLETE' THEN 'COMPLETE' ELSE 'PENDING' END
FROM preview_release_action build
JOIN preview_release release ON release.source_sha=build.source_sha
WHERE build.remote_id IS NOT NULL
  AND build.kind IN ('IOS_BUILD','ANDROID_BUILD')
  AND (
    build.state IN ('ERRORED','FAILED','CANCELED','CANCELLED')
    OR build.kind='ANDROID_BUILD' AND build.state='FINISHED'
    OR build.kind='IOS_BUILD' AND build.state='FINISHED' AND EXISTS (
      SELECT 1 FROM preview_release_action distribution
      WHERE distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION'
        AND distribution.state='FINISHED'
        AND distribution.evidence->>'easBuildId'=build.remote_id
        AND distribution.evidence->>'associated'='true'
    )
  )
ON CONFLICT (platform, build_id) DO NOTHING;
