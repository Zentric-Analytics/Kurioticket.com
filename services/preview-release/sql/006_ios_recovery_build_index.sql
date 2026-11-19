-- Allow owner-authorized iOS recovery attempts to coexist with the canonical
-- per-SHA iOS build record while still preserving exactly one canonical record
-- for each source SHA.
DROP INDEX IF EXISTS preview_release_one_ios_build_per_sha;

CREATE UNIQUE INDEX IF NOT EXISTS preview_release_one_canonical_ios_build_per_sha
  ON preview_release_action(source_sha)
  WHERE kind='IOS_BUILD' AND identity_key NOT LIKE 'native-build-recovery:ios:%';
