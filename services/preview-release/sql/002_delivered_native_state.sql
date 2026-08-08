CREATE TABLE IF NOT EXISTS preview_delivered_native_state (
  platform text PRIMARY KEY CHECK (platform IN ('ios','android')),
  source_sha text NOT NULL REFERENCES preview_release(source_sha) ON DELETE RESTRICT
    CHECK (source_sha ~ '^[0-9a-f]{40}$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{40,128}$'),
  eas_build_id text NOT NULL UNIQUE,
  app_version text NOT NULL CHECK (app_version ~ '^[0-9]+(\.[0-9]+){1,3}$'),
  build_number bigint NOT NULL CHECK (build_number > 0),
  submission_id text,
  apple_build_id text,
  testflight_distribution_id text,
  delivered_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (platform='ios' AND submission_id IS NOT NULL AND apple_build_id IS NOT NULL AND testflight_distribution_id IS NOT NULL)
    OR
    (platform='android' AND submission_id IS NULL AND apple_build_id IS NULL AND testflight_distribution_id IS NULL)
  )
);

-- A terminal delivery with incomplete immutable identity must never cause the
-- bootstrap to silently fall back to an older build.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM preview_release_action build
    WHERE build.kind IN ('IOS_BUILD','ANDROID_BUILD') AND build.state='FINISHED'
      AND (build.remote_id IS NULL OR build.evidence->>'appBuildVersion' !~ '^[0-9]+$'
           OR build.evidence->>'appVersion' !~ '^[0-9]+(\.[0-9]+){1,3}$')
  ) THEN
    RAISE EXCEPTION 'Canonical native delivery bootstrap found malformed terminal build identity';
  END IF;
END $$;

-- Bootstrap only an absent projection from durable, terminal platform evidence.
-- Numeric build order is authoritative; timestamps only break an exact-number tie,
-- which is rejected by runtime ambiguity checks before the projection is used.
WITH ios_candidates AS (
  SELECT release.source_sha,
         release.evidence->'fingerprints'->>'ios' AS fingerprint,
         build.remote_id AS eas_build_id,
         build.evidence->>'appVersion' AS app_version,
         (build.evidence->>'appBuildVersion')::bigint AS build_number,
         submission.remote_id AS submission_id,
         distribution.remote_id AS apple_build_id,
         distribution.identity_key AS testflight_distribution_id,
         distribution.updated_at AS delivered_at,
         row_number() OVER (
           ORDER BY (build.evidence->>'appBuildVersion')::bigint DESC, distribution.updated_at DESC
         ) AS candidate_rank
  FROM preview_release release
  JOIN preview_release_action build
    ON build.source_sha=release.source_sha AND build.kind='IOS_BUILD' AND build.state='FINISHED'
  JOIN preview_release_action submission
    ON submission.source_sha=release.source_sha AND submission.kind='IOS_SUBMISSION' AND submission.state='FINISHED'
  JOIN preview_release_action distribution
    ON distribution.source_sha=release.source_sha AND distribution.kind='IOS_TESTFLIGHT_DISTRIBUTION' AND distribution.state='FINISHED'
  WHERE release.evidence->'fingerprints'->>'ios' ~ '^[0-9a-f]{40,128}$'
    AND build.evidence->>'appVersion' ~ '^[0-9]+(\.[0-9]+){1,3}$'
    AND build.evidence->>'appBuildVersion' ~ '^[0-9]+$'
    AND submission.evidence->'submittedBuild'->>'id'=build.remote_id
    AND distribution.evidence->>'easBuildId'=build.remote_id
    AND distribution.evidence->>'easSubmissionId'=submission.remote_id
    AND distribution.evidence->>'associated'='true'
), android_candidates AS (
  SELECT release.source_sha,
         release.evidence->'fingerprints'->>'android' AS fingerprint,
         build.remote_id AS eas_build_id,
         build.evidence->>'appVersion' AS app_version,
         (build.evidence->>'appBuildVersion')::bigint AS build_number,
         build.updated_at AS delivered_at,
         row_number() OVER (
           ORDER BY (build.evidence->>'appBuildVersion')::bigint DESC, build.updated_at DESC
         ) AS candidate_rank
  FROM preview_release release
  JOIN preview_release_action build
    ON build.source_sha=release.source_sha AND build.kind='ANDROID_BUILD' AND build.state='FINISHED'
  WHERE release.evidence->'fingerprints'->>'android' ~ '^[0-9a-f]{40,128}$'
    AND build.evidence->>'appVersion' ~ '^[0-9]+(\.[0-9]+){1,3}$'
    AND build.evidence->>'appBuildVersion' ~ '^[0-9]+$'
)
INSERT INTO preview_delivered_native_state (
  platform, source_sha, fingerprint, eas_build_id, app_version, build_number,
  submission_id, apple_build_id, testflight_distribution_id, delivered_at
)
SELECT 'ios', source_sha, fingerprint, eas_build_id, app_version, build_number,
       submission_id, apple_build_id, testflight_distribution_id, delivered_at
FROM ios_candidates WHERE candidate_rank=1
UNION ALL
SELECT 'android', source_sha, fingerprint, eas_build_id, app_version, build_number,
       NULL, NULL, NULL, delivered_at
FROM android_candidates WHERE candidate_rank=1
ON CONFLICT (platform) DO NOTHING;

-- A numeric build number identifies one immutable build per platform. Reject
-- conflicting top candidates instead of using timestamps or lexical ordering.
DO $$
DECLARE platform_name text;
BEGIN
  FOREACH platform_name IN ARRAY ARRAY['ios','android'] LOOP
    IF EXISTS (
      SELECT build.evidence->>'appBuildVersion'
      FROM preview_release_action build
      WHERE build.kind=CASE WHEN platform_name='ios' THEN 'IOS_BUILD' ELSE 'ANDROID_BUILD' END
        AND build.state='FINISHED'
      GROUP BY build.evidence->>'appBuildVersion'
      HAVING count(DISTINCT build.remote_id) > 1
    ) THEN
      RAISE EXCEPTION 'Canonical % native delivery bootstrap is ambiguous', platform_name;
    END IF;
  END LOOP;
END $$;
