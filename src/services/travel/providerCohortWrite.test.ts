import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("large cohort persistence binds payload once without returning the full JSON", () => {
  const source = readFileSync(new URL("./providerResultCache.ts", import.meta.url), "utf8");
  const helper = source.slice(source.indexOf("function writeSearchCohort"), source.indexOf("function rememberCarInMemory"));
  assert.equal((helper.match(/\$\{payload\}/g) ?? []).length, 1);
  assert.match(helper, /\$executeRaw/);
  assert.match(helper, /EXCLUDED\."normalizedResult"/);
  assert.doesNotMatch(helper, /RETURNING|\.upsert\(/);
  assert.match(source, /await writeSearchCohort\("hotel"/);
  assert.match(source, /await writeSearchCohort\("car"/);
});
