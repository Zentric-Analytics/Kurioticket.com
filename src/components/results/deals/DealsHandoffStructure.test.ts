import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/deals/handoff/page.tsx", "utf8");
const client = fs.readFileSync("src/components/results/deals/DealsHandoffClient.tsx", "utf8");
const card = fs.readFileSync("src/components/results/deals/DealsHandoffStepCard.tsx", "utf8");
const summary = fs.readFileSync("src/components/results/deals/DealsHandoffSummary.tsx", "utf8");
const presentation = fs.readFileSync("src/lib/deals/dealsHandoffPresentation.ts", "utf8");

test("handoff keeps the responsive summary and ordered provider steps contract", () => {
  assert.match(page, /page-shell max-w-5xl/); assert.match(client, /xl:grid-cols-\[minmax\(0,1fr\)_300px\]/); assert.match(client, /<DealsHandoffSummary[\s\S]*<div className="order-2/); assert.match(client, /<ol id="provider-steps"/); assert.match(summary, /role="progressbar"/); assert.match(card, /aria-current=/);
});
test("provider activation remains safe, persistent, specific, and accessible", () => {
  assert.match(client, /markDealsProviderOpened/); assert.match(client, /writeDealsTripPlan/); assert.match(client, /getNextDealsProviderStep/); assert.match(card, /target="_blank"/); assert.match(card, /rel="noopener noreferrer"/); assert.match(card, /deals\.handoff\.newTab/); assert.match(client, /plan\.resultsPath/); assert.match(card, /min-h-11/); assert.doesNotMatch(client + card, /window\.open|partnerRedirectUrl|bookingUrl|Open details/);
});
test("handoff cards omit provider identities while preserving product, price, and action contracts", () => {
  assert.doesNotMatch(card, /deals\.handoff\.providerLabel|step\.provider/);
  assert.doesNotMatch(card, /<Detail className="mt-5 border-t border-slate-200 pt-4"/);
  assert.doesNotMatch(card, /provider(?:Logo|Badge)|(?:logo|badge).*provider/i);

  assert.match(card, /deals\.handoff\.providerPrice/);
  assert.match(card, /deals\.handoff\.sourcePrice/);
  assert.match(card, /price\.providerFormatted/);

  assert.match(card, /step\.airline/); assert.match(card, /step\.routeLabel/);
  assert.match(card, /step\.name/); assert.match(card, /step\.roomType/);
  assert.match(card, /step\.company/); assert.match(card, /step\.model/);

  assert.match(card, /href=\{step\.href\}/); assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/); assert.match(card, /onClick=\{onOpen\}/);
  assert.match(card, /deals\.handoff\.newTab/);
  assert.match(presentation, /provider:\s*item\.provider/);
});
test("loading and exceptional states use dedicated accessible presentations", () => {
  assert.match(client, /DealsHandoffSkeleton/); assert.match(client, /<StatePanel/); assert.match(client, /progressUnsaved/); assert.match(client, /getDealsTripPlanEstimatedTotal/); assert.match(client, /deals\.handoff\.returnSearch/); assert.doesNotMatch(client + card, /line-clamp-|truncate|h-\[[^\]]+\]/);
});

test("handoff uses the details-page back link before its single page heading", () => {
  assert.match(client, /import \{ DetailsBackLink \} from "@\/components\/results\/DetailsBackLink"/);
  assert.match(client, /<DetailsBackLink href=\{plan\.resultsPath\}>\{t\("deals\.handoff\.returnResults"\)\}<\/DetailsBackLink>/);
  const backLink = client.indexOf("<DetailsBackLink");
  const eyebrow = client.indexOf('t("deals.handoff.eyebrow")');
  const heading = client.indexOf("<h1");
  const explanation = client.indexOf('t("deals.handoff.explanation")');
  assert.ok(backLink < eyebrow && eyebrow < heading && heading < explanation);
  assert.match(client, /className=\{plan \? "mt-4" : ""\}/);
  assert.equal((page + client).match(/<h1/g)?.length, 1);
});

test("trip summary keeps its content without owning results navigation", () => {
  assert.doesNotMatch(summary, /from "next\/link"|ArrowLeft|resultsPath|deals\.handoff\.returnResults/);
  assert.match(summary, /deals\.handoff\.tripSummary/);
  assert.match(summary, /role="progressbar"/);
  assert.match(summary, /deals\.handoff\.estimatedCombinedTotal/);
  assert.match(summary, /deals\.handoff\.goToNextStep/);
});

test("handoff shell and navigation remain free of unsafe back fallbacks", () => {
  assert.match(page, /flex-1 bg-\[#f6f8fb\] py-7 sm:py-10/);
  assert.match(page, /page-shell max-w-5xl/);
  assert.doesNotMatch(page + client + summary, /router\.back|history\.back|document\.referrer/);
  assert.doesNotMatch(client + summary, /ArrowLeft/);
});
