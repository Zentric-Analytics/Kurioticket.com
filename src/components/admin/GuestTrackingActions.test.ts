import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { GuestTrackingActions } = jiti("./GuestTrackingActions") as typeof import("./GuestTrackingActions");

test("guest Manage starts closed with correct identity label and no fake Delete operation", () => {
  const html = renderToStaticMarkup(createElement(GuestTrackingActions, {
    visitorId: "qa-guest-test-123", backHref: "/admin/users?identity=GUEST",
  }));
  assert.match(html, /aria-label="Manage guest qa-guest-test-123"/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, />Manage/);
  assert.doesNotMatch(html, /Delete guest data|Permanently delete|Suspend|aria-expanded="true"/);
});
