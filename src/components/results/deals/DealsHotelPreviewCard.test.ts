import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(
  new URL("./DealsHotelPreviewCard.tsx", import.meta.url),
  "utf8",
);

test("the Hotel preview divides only its major information groups", () => {
  for (const contract of [
    "divide-y",
    "divide-slate-200",
    "border-y",
    "border-slate-200",
    "py-3",
    "mt-5 border-t border-slate-200 pt-4",
  ])
    assert.ok(card.includes(contract), `missing ${contract}`);

  for (const forbidden of [
    "divide-x",
    "border-dashed",
    "border-blue",
    'role="separator"',
  ])
    assert.ok(!card.includes(forbidden), `unexpected ${forbidden}`);
});

test("the Hotel information group follows identity and precedes price and action", () => {
  const name = card.indexOf("{hotel.name}");
  const stars = card.indexOf("Array.from({ length: stars }");
  const location = card.indexOf("hotel.neighbourhood || hotel.location");
  const group = card.indexOf(
    "mt-4 divide-y divide-slate-200 border-y border-slate-200",
  );
  const price = card.indexOf("mt-auto pt-5", group);
  const action = card.indexOf("mt-5 border-t border-slate-200 pt-4", price);
  assert.ok(
    name < stars &&
      stars < location &&
      location < group &&
      group < price &&
      price < action,
  );

  const identity = card.slice(name, group);
  assert.ok(!identity.includes("border-") && !identity.includes("divide-"));
  const beforeImage = card.slice(
    0,
    card.indexOf('</div><div className="flex flex-1 flex-col p-5"'),
  );
  assert.ok(
    !beforeImage.includes("border-y") && !beforeImage.includes("divide-y"),
  );
});

test("the Hotel details preserve review and stay contracts and avoid empty groups", () => {
  for (const contract of [
    "score",
    "band",
    "count",
    "deals.results.review",
    "deals.results.reviews",
    "hotel.roomType",
    "hotel.cancellationInfo",
    "hotel.amenities?.slice(0, 2)",
    "hasReviewDetails",
    "hasStayDetails",
    "hasDetails &&",
  ])
    assert.ok(card.includes(contract), `missing ${contract}`);

  const staySection = card.slice(
    card.indexOf('className="space-y-1 py-3'),
    card.indexOf("</div>}", card.indexOf('className="space-y-1 py-3')),
  );
  assert.ok(
    !staySection.includes("border-") && !staySection.includes("divide-"),
  );
});

test("the Hotel selection and unavailable provider actions remain intact", () => {
  for (const contract of [
    "aria-pressed",
    "onClick={onSelect}",
    "deals.selection.disclosure",
    "Button",
    "disabled",
    "continueToProvider",
    "ArrowRight",
    "aria-describedby",
    "focus-visible:outline",
  ])
    assert.ok(card.includes(contract), `missing ${contract}`);
});
