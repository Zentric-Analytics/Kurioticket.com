import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const brandedLoadingSource = readFileSync(
  new URL("./BrandedLoading.tsx", import.meta.url),
  "utf8",
);
const presentationSource = readFileSync(
  new URL("../../shared/presentation/searchLoadingPresentation.ts", import.meta.url),
  "utf8",
);

test("web loading adapts the canonical rotating search presentation", () => {
  assert.doesNotMatch(
    brandedLoadingSource,
    /import\s*\{[^}]*SEARCH_LOADING_ROTATION_MS[^}]*\}\s*from/,
  );
  assert.match(brandedLoadingSource, /const WEB_LOADING_MESSAGE_ROTATION_MS = 1_800/);
  assert.match(brandedLoadingSource, /title: presentation\.title/);
  assert.match(brandedLoadingSource, /messages: \[\.\.\.presentation\.messages\]/);
});

test("shared travel loading copy remains a canonical message sequence", () => {
  assert.match(presentationSource, /messages: readonly string\[\]/);
  assert.doesNotMatch(presentationSource, /SEARCH_LOADING_ROTATION_MS/);
  for (const product of ["flight", "hotel", "car"]) {
    assert.match(presentationSource, new RegExp(`${product}: \\{[\\s\\S]*?messages: \\[`));
  }
});

test("web-only multi-message loaders retain local rotation support", () => {
  assert.match(brandedLoadingSource, /loadingMessages\.length <= 1/);
  assert.match(brandedLoadingSource, /window\.setInterval/);
  assert.match(brandedLoadingSource, /searchLoadingCopy = \{/);
  assert.match(brandedLoadingSource, /deals: \{[\s\S]*?messages: \[/);
  assert.match(brandedLoadingSource, /travel: \{[\s\S]*?messages: \[/);
});
