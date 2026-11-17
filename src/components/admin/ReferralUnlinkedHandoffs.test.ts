import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReferralUnlinkedHandoffs } from "./ReferralUnlinkedHandoffs";

test("Referral Attribution unlinked handoffs are an inline, collapsed control rather than a navigation link", () => {
  const html = renderToStaticMarkup(createElement(ReferralUnlinkedHandoffs, {
    window: { start: "2026-11-01T00:00:00.000Z", end: "2026-11-17T00:00:00.000Z" },
    environment: "staging",
    unlinkedCount: 12,
    providers: ["Duffel", "KAYAK sandbox"],
  }));
  assert.match(html, /View 12 handoffs without a linked search/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls=/);
  assert.match(html, /hidden=""/);
  assert.doesNotMatch(html, /href="\/admin\/(?:redirects|searches)/);
  assert.doesNotMatch(html, /Loading provider handoffs/);
});
