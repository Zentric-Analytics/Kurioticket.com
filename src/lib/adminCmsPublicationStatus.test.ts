import assert from "node:assert/strict";
import test from "node:test";
import { getCmsUnpublishedChangeLabel, type CmsPublicationSnapshot } from "./adminCmsPublicationStatus";

const published: CmsPublicationSnapshot = {
  publishedVersion: 1,
  draftPayload: { city: "Madrid", routes: ["DXB", "MAD"], settings: { featured: true, display: "Spain" } },
  publishedPayload: { settings: { display: "Spain", featured: true }, routes: ["DXB", "MAD"], city: "Madrid" },
  market: "MIDDLE_EAST",
  publishedMarket: "MIDDLE_EAST",
  locale: "en",
  publishedLocale: "en",
  sortOrder: 12,
  publishedSortOrder: 12,
};

test("automatic order normalization is labeled as an order change, not a content edit", () => {
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, sortOrder: 13 }), "Unpublished order changes");
});

test("real payload edits are still clearly flagged as unpublished content changes", () => {
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, draftPayload: { city: "Barcelona" } }), "Unpublished content changes");
});

test("content and ordering updates both appear when both are pending", () => {
  assert.equal(getCmsUnpublishedChangeLabel({
    ...published,
    sortOrder: 13,
    draftPayload: { city: "Barcelona" },
  }), "Unpublished content and order changes");
});

test("changing a market or language is not silently treated as harmless normalization", () => {
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, market: "NG" }), "Unpublished market changes");
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, locale: "fr" }), "Unpublished language changes");
});

test("a version bump with unchanged publication data has no false warning", () => {
  assert.equal(getCmsUnpublishedChangeLabel(published), null);
});

test("unpublished new drafts have no published comparison, and missing published data stays visible", () => {
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, publishedVersion: null, publishedPayload: null }), null);
  assert.equal(getCmsUnpublishedChangeLabel({ ...published, publishedPayload: null }), "Unpublished changes");
});
