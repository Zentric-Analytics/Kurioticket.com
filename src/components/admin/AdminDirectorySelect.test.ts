import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  jsx: { runtime: "automatic" },
  fsCache: false,
});
const { AdminDirectorySelect } = jiti(
  "./AdminDirectorySelect",
) as typeof import("./AdminDirectorySelect");

const options = [
  { value: "ALL", label: "All identities" },
  { value: "REGISTERED", label: "Registered" },
  { value: "GUEST", label: "Guests" },
] as const;

test("server rendering preserves a usable native filter when JS is absent", () => {
  const html = renderToStaticMarkup(createElement(AdminDirectorySelect, {
    name: "identity", label: "Identity type", value: "GUEST", options,
  }));
  assert.match(html, /<select[^>]*name="identity"/);
  assert.match(html, /<option value="GUEST" selected=""/);
  assert.match(html, /Identity type/);
  assert.match(html, /Registered/);
  assert.match(html, /h-11/);
  assert.doesNotMatch(html, /role="listbox"|role="combobox"|type="hidden"/);
});

test("server sort fallback provides explicit Apply sort without JavaScript", () => {
  const html = renderToStaticMarkup(createElement(AdminDirectorySelect, {
    name: "sort", label: "Sort by", value: "newest",
    options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }],
    compact: true,
    autoSubmit: true,
  }));
  assert.match(html, /<select[^>]*name="sort"/);
  assert.match(html, /<option value="newest" selected=""/);
  assert.match(html, /Sort by/);
  assert.match(html, /Apply sort/);
  assert.match(html, /h-10/);
  assert.doesNotMatch(html, /role="listbox"|type="hidden"/);
});
