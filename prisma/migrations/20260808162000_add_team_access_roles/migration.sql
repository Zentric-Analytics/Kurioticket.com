ALTER TABLE "PreviewTester"
ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY['TESTER']::TEXT[];

UPDATE "PreviewTester"
SET "roles" = ARRAY['TESTER']::TEXT[]
WHERE cardinality("roles") = 0;

ALTER TABLE "PreviewTester"
ADD CONSTRAINT "PreviewTester_roles_allowed"
CHECK (
  "roles" <@ ARRAY['TESTER', 'DEVELOPER']::TEXT[]
  AND cardinality("roles") > 0
);

CREATE INDEX "PreviewTester_roles_idx" ON "PreviewTester" USING GIN ("roles");
