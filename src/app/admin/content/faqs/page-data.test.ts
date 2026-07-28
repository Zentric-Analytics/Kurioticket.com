import assert from "node:assert/strict";
import test from "node:test";

import { faqItemKeys, getGeneralFaqs, homepageMobileFaqLimit } from "@/content/faqs";
import { carsFaqItems } from "@/data/carsLandingContent";
import { getTranslations } from "@/lib/i18n";

import {
  deriveFaqDisplayId,
  detectFaqDefinitionDuplicates,
  filterFaqInventoryRows,
  getFaqInventorySummary,
  parseFaqInventorySearchParams,
  selectFaqInventoryRows,
} from "./page-data";

const rows = selectFaqInventoryRows();

test("selector derives all records and summary metrics from both source collections", () => {
  assert.equal(rows.length, faqItemKeys.length + carsFaqItems.length);
  assert.deepEqual(getFaqInventorySummary(rows), { total: 21, generalAndSupport: 15, cars: 6, collections: 2 });
  assert.equal(rows.filter((row) => row.collection === "GENERAL").length, 8);
  assert.equal(rows.filter((row) => row.collection === "SUPPORT").length, 7);
  assert.equal(rows.filter((row) => row.collection === "CARS").length, 6);
});

test("general/support definitions receive stable IDs without changing their source keys", () => {
  const [questionKey] = faqItemKeys[0];
  const row = rows[0];
  assert.equal(row.faqId, deriveFaqDisplayId(questionKey));
  assert.equal(row.questionKey, questionKey);
  assert.equal(deriveFaqDisplayId("supportFaqAccountQuestion"), "support-faq-account");
});

test("selector uses English translations and describes runtime localisation", () => {
  const english = getTranslations("en-us");
  assert.ok(rows.every((row) => row.englishFallbackQuestion === english[row.questionKey]));
  assert.ok(rows.every((row) => row.englishFallbackAnswer === english[row.answerKey]));
  assert.ok(rows.every((row) => row.localizationBehaviour.includes("Localised at runtime")));
  assert.equal(getGeneralFaqs((key) => english[key] ?? "").length, faqItemKeys.length);
});

test("public surfaces distinguish homepage-limited, full FAQ-page, support, and Cars use", () => {
  const homepageRows = rows.filter((row) => row.publicSurface.includes("homepage mobile limited set"));
  assert.equal(homepageRows.length, homepageMobileFaqLimit);
  assert.ok(rows.filter((row) => row.collection === "SUPPORT").every((row) => row.publicSurface === "Full FAQ page"));
  assert.ok(rows.filter((row) => row.collection === "CARS").every((row) => row.publicSurface === "Cars landing page"));
});

test("duplicate detection covers IDs, keys, and English fallback questions", () => {
  const fixture = [rows[0], {
    ...rows[1],
    faqId: rows[0].faqId.toUpperCase(),
    questionKey: rows[0].questionKey,
    answerKey: rows[0].answerKey,
    englishFallbackQuestion: ` ${rows[0].englishFallbackQuestion} `,
  }];
  const duplicates = detectFaqDefinitionDuplicates(fixture);
  assert.ok(duplicates.ids.has(rows[0].faqId));
  assert.ok(duplicates.questionKeys.has(rows[0].questionKey.toLocaleLowerCase()));
  assert.ok(duplicates.answerKeys.has(rows[0].answerKey.toLocaleLowerCase()));
  assert.ok(duplicates.fallbackQuestions.has(rows[0].englishFallbackQuestion.toLocaleLowerCase()));
});

test("search fields and collection filtering compose without pagination", () => {
  const car = rows.find((row) => row.collection === "CARS");
  assert.ok(car);
  for (const q of [car.faqId, car.questionKey, car.answerKey, car.englishFallbackQuestion]) {
    const matches = filterFaqInventoryRows(rows, parseFaqInventorySearchParams({ q, collection: "CARS" }));
    assert.ok(matches.some((row) => row.rowId === car.rowId));
    assert.ok(matches.every((row) => row.collection === "CARS"));
  }
  assert.deepEqual(parseFaqInventorySearchParams({ collection: "UNKNOWN" }), { q: "", collection: "ALL" });
});
