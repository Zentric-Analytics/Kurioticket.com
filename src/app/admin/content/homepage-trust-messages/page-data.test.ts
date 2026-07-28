import assert from "node:assert/strict";
import test from "node:test";

import { homepageTrustMessages } from "@/data/homepageTrustMessages";
import { publicLocaleOptions } from "@/lib/i18n";
import { translations as englishTranslations } from "@/lib/i18n/en";

import {
  getHomepageTrustMessageSummary,
  hasHomepageTrustMessageIssues,
  selectHomepageTrustMessageRows,
} from "./page-data";

const rows = selectHomepageTrustMessageRows();

test("selector and summary metrics derive from the trust-message and locale sources", () => {
  const summary = getHomepageTrustMessageSummary(rows);
  assert.equal(rows.length, homepageTrustMessages.length);
  assert.equal(summary.messages, 3);
  assert.equal(summary.uniqueIds, 3);
  assert.equal(summary.possibleTranslations, homepageTrustMessages.length * publicLocaleOptions.length);
  assert.equal(summary.titleCoverage, summary.possibleTranslations);
  assert.equal(summary.bodyCoverage, summary.possibleTranslations);
  assert.equal(summary.publicUsage, "Homepage");
});

test("selector preserves message IDs and translation keys", () => {
  assert.deepEqual(rows.map(({ id, titleKey, bodyKey }) => ({ id, titleKey, bodyKey })), homepageTrustMessages);
});

test("English fallbacks resolve from the existing English dictionary", () => {
  for (const row of rows) {
    assert.equal(row.englishFallbackTitle, englishTranslations[row.titleKey]);
    assert.equal(row.englishFallbackBody, englishTranslations[row.bodyKey]);
    assert.equal(row.missingEnglishFallbackTitle, false);
    assert.equal(row.missingEnglishFallbackBody, false);
  }
});

test("locale coverage separates missing values and raw-key fallbacks", () => {
  const [row] = selectHomepageTrustMessageRows(
    [{ id: "sample", titleKey: "sampleTitle", bodyKey: "sampleBody" }],
    ["complete", "missing", "raw"],
    (locale) => locale === "complete"
      ? { sampleTitle: "Title", sampleBody: "Body" }
      : locale === "raw"
        ? { sampleTitle: "sampleTitle", sampleBody: "sampleBody" }
        : {},
  );
  assert.equal(row.titleCoverage, 1);
  assert.equal(row.bodyCoverage, 1);
  assert.deepEqual(row.missingTitleLocales, ["missing"]);
  assert.deepEqual(row.missingBodyLocales, ["missing"]);
  assert.deepEqual(row.rawKeyTitleLocales, ["raw"]);
  assert.deepEqual(row.rawKeyBodyLocales, ["raw"]);
  assert.equal(hasHomepageTrustMessageIssues(row), true);
});

test("selector flags duplicates and missing English fallback values without removing records", () => {
  const messages = [
    { id: "duplicate", titleKey: "missingTitle", bodyKey: "missingBody" },
    { id: " DUPLICATE ", titleKey: "missingTitle", bodyKey: "missingBody" },
  ];
  const fixtureRows = selectHomepageTrustMessageRows(messages, ["en-us"], () => ({}));
  assert.equal(fixtureRows.length, messages.length);
  assert.ok(fixtureRows.every((row) => row.duplicateId && row.duplicateTitleKey && row.duplicateBodyKey));
  assert.ok(fixtureRows.every((row) => row.missingEnglishFallbackTitle && row.missingEnglishFallbackBody));
  assert.ok(fixtureRows.every((row) => row.missingTitleLocales.includes("en-us") && row.missingBodyLocales.includes("en-us")));
});
