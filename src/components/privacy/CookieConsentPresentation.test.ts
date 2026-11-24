import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { CookieConsentPresentation } = jiti("./CookieConsentPresentation") as typeof import("./CookieConsentPresentation");

const render = (editing: boolean, draftAnalytics = false) => renderToStaticMarkup(createElement(CookieConsentPresentation, {
  showBanner: true, editing, modal: true, draftAnalytics, decisionPending: false, syncState: "idle",
  onOpen() {}, onClose() {}, onDraftChange() {}, onChoose() {}, onRetry() {},
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
  assert.match(markup, /Save my preferences/);
  assert.doesNotMatch(markup, /Marketing cookies|Performance cookies/);
});
