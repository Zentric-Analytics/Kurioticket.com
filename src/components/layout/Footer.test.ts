import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf8");
const resultsPage = readFileSync(
  new URL("../../app/flights/results/page.tsx", import.meta.url),
  "utf8",
);
const hotelResultsPage = readFileSync(
  new URL("../../app/hotels/results/page.tsx", import.meta.url),
  "utf8",
);

test("Footer defaults to the complete navigation and brand/legal presentation", () => {
  assert.match(footer, /variant = "full"/);
  assert.match(footer, /variant === "full"/);
  assert.match(footer, /footerContactUs/);
  assert.match(footer, /footerDiscover/);
  assert.match(footer, /footerTermsSettings/);
  assert.match(footer, /footerAboutKurioticket/);
  assert.match(footer, /<KurioticketLogo/);
});

test("brand/legal-only Footer retains shared legal content without upper navigation", () => {
  assert.match(footer, /"brand-legal-only"/);
  assert.match(footer, /footerConfidenceTagline/);
  assert.match(footer, /sellerOfTravelNotice/);
  assert.match(footer, /footerAllRightsReserved/);
  assert.match(footer, /footerPrivacy/);
  assert.match(footer, /footerTerms/);
  assert.match(footer, /footerCookies/);
  assert.match(footer, /variant === "full" \? \(/);
  assert.match(footer, /variant === "full" \? "mt-10[^\n]+" : "pt-0"/);
});

test("Flight Results explicitly selects the brand/legal-only Footer", () => {
  assert.match(resultsPage, /<Footer variant="brand-legal-only" \/>/);
  assert.equal(resultsPage.match(/<Footer/g)?.length, 1);
});

test("Hotel Results explicitly selects the brand/legal-only Footer", () => {
  assert.match(hotelResultsPage, /<Footer variant="brand-legal-only" \/>/);
  assert.equal(hotelResultsPage.match(/<Footer/g)?.length, 1);
});
