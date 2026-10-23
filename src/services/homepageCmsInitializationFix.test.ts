import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("src/services/homepageCmsService.ts", "utf8");

test("homepage CMS seed deduplicates repeated destination ids within each market", () => {
  assert.match(service, /items\.findIndex\(\(item\) => item\.id === destination\.id\) === index/);
});

test("homepage CMS seed performs a composite-identity preflight", () => {
  assert.match(service, /assertUniqueSeedRows/);
  assert.match(service, /row\.type/);
  assert.match(service, /row\.key/);
  assert.match(service, /row\.market/);
  assert.match(service, /CONTENT_LOCALE/);
  assert.match(service, /Homepage CMS seed contains duplicate content identities/);
});

test("homepage CMS initialization distinguishes unique and write conflicts", () => {
  assert.match(service, /error\.code === "P2002"/);
  assert.match(service, /homepage-initialize-unique-conflict/);
  assert.match(service, /unique content identity/);
  assert.match(service, /error\.code === "P2034"/);
  assert.match(service, /homepage-initialize-write-conflict/);
});
