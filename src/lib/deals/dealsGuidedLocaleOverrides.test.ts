import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const locales = ["ar", "nl", "es", "fr", "de", "it", "pt-br", "zh-cn", "ja", "ko", "hi", "tr", "pl", "sv", "id", "th", "vi"];
const keys = ["deals.guidedPreview.description", "deals.guidedPreview.availableCar", "deals.guidedPreview.availableReview", "deals.guidedPreview.availableHandoff", "deals.guidedPreview.previewOnlyTitle", "deals.guidedPreview.previewOnlyPublicLaunch", "deals.guidedPreview.previewOnlyBooking", "deals.guided.confirmation.readError", "deals.guided.confirmation.saveError", "deals.guided.confirmation.retry", "deals.guided.crossTabUpdated", "deals.guided.conflict.title", "deals.guided.conflict.body", "deals.guided.conflict.restart", "deals.guided.conflict.restartDisclosure", "deals.guided.error.title", "deals.guided.error.body", "deals.guided.error.retry", "deals.guided.error.returnDeals"];

test("every audited non-English locale explicitly overrides new guided copy", () => {
  for (const locale of locales) {
    const source = readFileSync(new URL(`../i18n/${locale}.ts`, import.meta.url), "utf8");
    for (const key of keys) assert.equal(source.includes(`"${key}":`), true, `${locale}: ${key}`);
  }
});
