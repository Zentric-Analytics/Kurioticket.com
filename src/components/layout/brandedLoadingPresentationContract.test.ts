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

test("web loading adapts the canonical single-message search presentation", () => {
  assert.doesNotMatch(
    brandedLoadingSource,
    /import\s*\{[^}]*SEARCH_LOADING_ROTATION_MS[^}]*\}\s*from/,
  );
  assert.match(brandedLoadingSource, /const WEB_LOADING_MESSAGE_ROTATION_MS = 1_800/);
  assert.match(brandedLoadingSource, /title: presentation\.title/);
  assert.match(brandedLoadingSource, /messages: \[presentation\.supportingText\]/);
});

test("shared flight and car loading copy remains a canonical supporting message", () => {
  assert.match(presentationSource, /supportingText: string/);
  assert.doesNotMatch(presentationSource, /SEARCH_LOADING_ROTATION_MS/);
  assert.doesNotMatch(presentationSource, /messages: readonly string\[\]/);
});

test("web-only multi-message loaders retain local rotation support", () => {
  assert.match(brandedLoadingSource, /loadingMessages\.length <= 1/);
  assert.match(brandedLoadingSource, /window\.setInterval/);
  assert.match(brandedLoadingSource, /searchLoadingCopy = \{/);
  assert.match(brandedLoadingSource, /deals: \{[\s\S]*?messages: \[/);
  assert.match(brandedLoadingSource, /travel: \{[\s\S]*?messages: \[/);
});
