import { bindingExpression, evaluateExpression } from "../../test-support/sourceStructure";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("mobile web Hotel results navbar uses an edit icon for the search summary", () => {
  const section = bindingExpression(source, 'renderMobileHotelNavSearch');
  assert.match(section, /data-hotel-results-mobile-nav-search-button/);
  assert.match(section, /<SquarePen size=\{15\} strokeWidth=\{2\} \/>/);
  assert.doesNotMatch(section, /<Search|<PencilLine|<Pencil size/);
  assert.match(section, /text-\[#142033\]/);
  let opened = 0;
  const render = evaluateExpression<() => import('react').ReactElement<{ onClick: () => void; 'aria-haspopup': string; 'aria-expanded': boolean }>>(section, {
    mobileHotelSearchOpen: false, t: (key: string) => key, body: { destination: 'Fixture hotel' }, mobileNavDateSummary: 'Nov 15–19', mobileNavGuestsSummary: '2 guests', cn: (...values: unknown[]) => values.filter(Boolean).join(' '), SquarePen: () => null, openMobileHotelSearch: () => { opened++; }
  });
  const button = render(); button.props.onClick();
  assert.equal(opened, 1);
  assert.equal(button.props['aria-haspopup'], 'dialog');
  assert.equal(button.props['aria-expanded'], false);
});


test("Hotel mobile edit SquarePen has no icon-tile background", () => {
  const start = source.indexOf("data-hotel-results-mobile-nav-search-button");
  const end = source.indexOf("</button>", start);
  const section = source.slice(start, end);
  assert.match(section, /<SquarePen size=\{15\} strokeWidth=\{2\} \/>/);
  assert.doesNotMatch(section, /bg-\[#E6EFFD\]/);
  assert.match(section, /text-\[#142033\]/);
});
