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

test("accessible form-backed select keeps current value and desktop label", () => {
  const html = renderToStaticMarkup(createElement(AdminDirectorySelect, {
    name: "identity", label: "Identity type", value: "GUEST", options,
  }));
  assert.match(html, /type="hidden" name="identity" value="GUEST"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-label="Identity type"/);
  assert.match(html, />Guests</);
  assert.match(html, /h-11/);
  assert.doesNotMatch(html, /<select|<option/);
});

test("compact automatic sort uses the same accessible combobox without an extra card", () => {
  const html = renderToStaticMarkup(createElement(AdminDirectorySelect, {
    name: "sort", label: "Sort by", value: "newest",
    options: [{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }],
    compact: true,
    autoSubmit: true,
  }));
  assert.match(html, /name="sort" value="newest"/);
  assert.match(html, /aria-label="Sort by"/);
  assert.match(html, />Newest first</);
  assert.match(html, /h-10/);
  assert.doesNotMatch(html, /shadow-|rounded-2xl|role="listbox"/);
});
