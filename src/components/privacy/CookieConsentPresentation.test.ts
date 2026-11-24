import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { CookieConsentPresentation } = jiti("./CookieConsentPresentation") as typeof import("./CookieConsentPresentation");

const render = (editing: boolean, draftAnalytics = false, overrides: Partial<Parameters<typeof CookieConsentPresentation>[0]> = {}) => renderToStaticMarkup(createElement(CookieConsentPresentation, {
  showBanner: true, editing, modal: true, draftAnalytics, decisionPending: false, syncState: "idle",
  onOpen() {}, onClose() {}, onDraftChange() {}, onChoose() {}, onRetry() {}, ...overrides,
}));

test("initial consent banner offers explicit equally accessible decisions without a close button", () => {
  const markup = render(false);
  assert.match(markup, /We value your privacy/);
  assert.match(markup, /Reject optional/);
  assert.match(markup, /Accept all/);
  assert.match(markup, /Cookie preferences/);
  assert.doesNotMatch(markup, /Close cookie preferences/);
  assert.doesNotMatch(markup, /role="switch"/);
});

test("preferences show only supported categories and reflect the analytics draft", () => {
  const markup = render(true);
  assert.match(markup, /Always active/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="cookie-essential-description"/);
  assert.match(markup, /role="switch" aria-label="Analytics cookies" aria-checked="false"/);
  assert.match(render(true, true), /role="switch" aria-label="Analytics cookies" aria-checked="true"/);
  assert.match(markup, /Save preferences/);
  assert.doesNotMatch(markup, /Marketing cookies|Performance cookies/);
});

test("detail window removes redundant links and reject button while preserving a clear opt-out", () => {
  const markup = render(true, false, { showBanner: false });
  assert.doesNotMatch(markup, /Cookie Policy|Privacy Policy|Reject optional|Your privacy\. Your choice\.|Save my preferences/);
  assert.match(markup, /Cookie categories/);
  assert.match(markup, /Analytics is optional; leave it off and save/);
  assert.match(markup, /Accept all/);
  assert.match(markup, /Save preferences/);
  assert.match(markup, /aria-modal="true"/);
});

test("saving an explicit choice uses a non-modal status instead of replaying the initial banner", () => {
  const markup = render(false, false, { modal: false, showBanner: false, decisionPending: true, syncState: "saving" });
  assert.match(markup, /Saving your choice/);
  assert.doesNotMatch(markup, /We value your privacy|<dialog|Reject optional|Accept all/);
  const failure = render(false, false, { modal: false, showBanner: false, decisionPending: true, syncState: "error" });
  assert.match(failure, /Please retry/);
  assert.match(failure, />Retry</);
  assert.doesNotMatch(failure, /We value your privacy/);
});
