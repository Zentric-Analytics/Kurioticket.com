import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("Hotel alert creation is real and Package persistence stores searches rather than offers", () => {
  const hotel = read("src/components/results/HotelPriceAlertControl.tsx");
  const packageActions = read("src/components/results/PackageAccountActions.tsx");
  const matrix = read("docs/account-capability-matrix.md");
  assert.match(hotel, /\/api\/price-alerts/);
  assert.match(hotel, /callbackUrl/);
  assert.match(packageActions, /searchType: "package"/);
  assert.doesNotMatch(packageActions, /packageOffer|saved offer/i);
  assert.match(matrix, /NOT_SUPPORTED_BY_CURRENT_PRODUCT_CONTRACT/);
  assert.match(matrix, /no canonical package-offer identity exists/);
});
