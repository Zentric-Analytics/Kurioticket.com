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
  assert.match(markup, /Decline optional/);
  assert.doesNotMatch(markup, /Essential only|Reject optional|Cookie Policy|Privacy Policy/);
  assert.doesNotMatch(markup, /Learn about our use of cookies/);
  assert.match(markup, /Accept all/);
  assert.match(markup, /Cookie preferences/);
  assert.doesNotMatch(markup, /Close cookie preferences/);
  assert.doesNotMatch(markup, /role="switch"/);
});

test("preferences show all four categories without exposing unsupported switches", () => {
  const markup = render(true);
  assert.match(markup, /Always active/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="cookie-essential-description"/);
  assert.match(markup, /role="switch" aria-label="Analytics cookies" aria-checked="false"/);
  assert.match(render(true, true), /role="switch" aria-label="Analytics cookies" aria-checked="true"/);
  assert.match(markup, /Save preferences/);
  assert.match(markup, /Marketing cookies/);
  assert.match(markup, /aria-controls="cookie-marketing-description"/);
  assert.doesNotMatch(markup, /role="switch" aria-label="Marketing cookies"/);
  assert.match(markup, /Performance cookies/);
  assert.match(markup, /Not available/);
  assert.doesNotMatch(markup, /role="switch" aria-label="Performance cookies"/);
});

test("detail window removes redundant links and reject button while preserving a clear opt-out", () => {
  const markup = render(true, false, { showBanner: false });
  assert.doesNotMatch(markup, /Cookie Policy|Privacy Policy|Reject optional|Your privacy\. Your choice\.|Save my preferences/);
  assert.match(markup, /Manage your preferences/);
  assert.doesNotMatch(markup, /Essential only|Decline optional/);
  assert.match(markup, /leave analytics off and save your preferences/);
  assert.match(markup, /Optional cookies are your choice/);
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
