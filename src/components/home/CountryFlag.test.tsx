import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("CountryFlag renders a decorative local SVG image without visible ISO fallback or badge styling", () => {
  const source = readFileSync(new URL("./CountryFlag.tsx", import.meta.url), "utf8");

  assert.match(source, /COUNTRY_FLAG_ASSET_BY_CODE\[countryCode\]/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /<Image/);
  assert.match(source, /alt=""/);
  assert.match(source, /data-country-flag/);
  assert.match(source, /bg-transparent/);
  assert.match(source, /h-\[18px\] w-\[27px\]/);
  assert.doesNotMatch(source, />\s*\{countryCode\}\s*</);
  assert.doesNotMatch(source, /bg-white|rounded-md|rounded-lg|className=.*border|className=.*ring|shadow|p-\d/);
});
