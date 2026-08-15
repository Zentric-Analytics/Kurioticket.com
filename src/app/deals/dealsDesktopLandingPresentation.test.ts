import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("desktop Deals hero keeps the approved image and a restrained light overlay", () => {
  assert.match(page, /const dealsHeroImage = "https:\/\/images\.unsplash\.com\/photo-1464037866556-6812c9d1c72e/);
  assert.match(
    page,
    /lg:bg-\[linear-gradient\(90deg,rgba\(248,250,252,0\.70\)_0%,rgba\(248,250,252,0\.39\)_34%,rgba\(248,250,252,0\.10\)_60%,rgba\(248,250,252,0\)_76%\)\]/,
  );
  assert.doesNotMatch(page, /rgba\(248,250,252,0\.96\)/);
  assert.match(page, /<DealsSearchForm presentation="desktop-landing"/);
});
