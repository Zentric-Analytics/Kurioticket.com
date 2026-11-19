import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  fsCache: false,
});
const { UserStatusActions } = jiti(
  "./UserStatusActions",
) as typeof import("./UserStatusActions");

const account = {
  userId: "qa-user-id",
  email: "qa@example.invalid",
  role: "USER",
  status: "ACTIVE",
  isSelf: false,
  isProtectedAdmin: false,
};
test("account actions start collapsed behind one accessible menu trigger", () => {
  const html = renderToStaticMarkup(createElement(UserStatusActions, account));
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, />Suspend</);
  assert.doesNotMatch(html, />Soft delete</);
});
test("current and protected administrators never receive an account menu", () => {
  for (const restriction of [{ isSelf: true }, { isProtectedAdmin: true }]) {
    const html = renderToStaticMarkup(
      createElement(UserStatusActions, { ...account, ...restriction }),
    );
    assert.doesNotMatch(html, /aria-haspopup/);
    assert.match(html, /Current admin|Protected admin/);
  }
});
