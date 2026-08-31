import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);

test("hotel result cards expose accessible image carousel controls", () => {
  for (const galleryContract of [
    "ChevronLeft",
    "ChevronRight",
    "Previous photo",
    "Next photo",
    "moveGallery",
    "left-2 top-1/2",
    "right-2 top-1/2",
    "-translate-y-1/2",
  ]) {
    assert.match(source, new RegExp(galleryContract));
  }
});

test("hotel result cards retain the conditional photo counter", () => {
  for (const retainedContract of [
    "showGalleryControls",
    "photoCounterText",
    "hotelResults.photoCounter",
    "availableImageIndices.length",
    "activeGalleryPosition",
    "bottom-2",
    "right-2",
  ]) {
    assert.match(source, new RegExp(retainedContract.replace(".", "\\.")));
  }

  assert.match(
    source,
    /const showGalleryControls = availableImageIndices\.length > 1;/,
  );
  assert.match(source, /\{showGalleryControls \? \(\s*<>/);
});

test("hotel result cards retain image fallback and presentation contracts", () => {
  for (const retainedContract of [
    "buildHotelGalleryCandidates",
    "resolveHotelGalleryIndex",
    "failedImageUrls",
    "markImageFailed",
    "displayImageUrl",
    "Image",
    "object-cover",
    "onError",
  ]) {
    assert.match(source, new RegExp(retainedContract));
  }
});

test("hotel result cards use a horizontal image and details grid on mobile", () => {
  assert.match(
    source,
    /data-hotel-card-mobile-grid[\s\S]*grid-cols-\[41%_minmax\(0,1fr\)\]/,
  );
  assert.match(
    source,
    /data-hotel-card-image[\s\S]*h-full[\s\S]*min-h-\[260px\]/,
  );
  assert.match(source, /data-hotel-card-details/);
  assert.ok(!source.includes("h-[clamp(220px,58vw,250px)]"));
  assert.ok(!source.includes("h-[clamp(280px,78vw,340px)]"));
  assert.match(source, /md:grid-cols-\[40%_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[clamp\(280px,36%,340px\)_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:max-w-none/);
});

test("desktop cards narrow only the details column and remain left aligned", () => {
  assert.match(
    source,
    /max-w-\[800px\][\s\S]*lg:mx-0 lg:max-w-none/,
  );
  assert.match(
    source,
    /md:grid-cols-\[40%_minmax\(0,1fr\)\][\s\S]*lg:grid-cols-\[clamp\(280px,36%,340px\)_minmax\(0,1fr\)\]/,
  );
  assert.match(source, /sizes="\(min-width: 768px\) 320px, 41vw"/);
  assert.match(source, /className="object-cover"/);
});

test("desktop hotel headings reserve two-line space for card-edge actions", () => {
  assert.match(source, /lg:pe-\[88px\]/);
  assert.match(source, /lg:line-clamp-2/);
  assert.match(
    source,
    /data-hotel-desktop-utility-actions[\s\S]*absolute -end-3 -top-2[\s\S]*lg:flex/,
  );
});

test("hotel result cards retain saved-hotel controls", () => {
  for (const retainedContract of [
    "savedHotelLabel",
    "aria-pressed={isSaved}",
    "disabled={!isSaved && !hasValidPrice}",
    "toggleSavedHotel",
    "Heart",
    'fill={isSaved ? "currentColor" : "none"}',
  ]) {
    assert(source.includes(retainedContract));
  }
});

test("hotel result cards retain content, pricing, and details contracts", () => {
  for (const retainedContract of [
    "hotel.name",
    "sortBadgeConfig",
    "starRating",
    "hotel.location",
    "reviewBand",
    "reviewCountText",
    "HotelAmenityList",
    "nightlyDisplayPrice",
    "LinkButton",
    "resolvedDetailsHref",
  ]) {
    assert.match(source, new RegExp(retainedContract.replace(".", "\\.")));
  }
});

test("hotel result cards present primary location and truthful stay pricing", () => {
  for (const removedContract of [
    "distanceText",
    "getDistanceDisplay",
    "roomTypeText",
    "taxesAndFeesText",
  ]) {
    assert.ok(
      !source.includes(removedContract),
      `unexpected ${removedContract}`,
    );
  }

  for (const retainedContract of [
    "hotel.location",
    "HotelAmenityList",
    "nightlyDisplayPrice",
    "totalDisplayPrice",
    "estimated total for",
    "hotelResults.pricePerNight",
    "hotelResults.viewHotel",
  ]) {
    assert.ok(source.includes(retainedContract), `missing ${retainedContract}`);
  }
});

test("hotel result cards separate the nightly amount from its localized label", () => {
  assert.ok(
    source.includes(
      'const pricePerNightTemplate = t("hotelResults.pricePerNight")',
    ),
  );
  assert.match(
    source,
    /pricePerNightTemplate\s*\.replace\(\/\\\{\\\{\\s\*price/,
  );
  assert.match(
    source,
    /aria-hidden="true"[\s\S]*nightlyDisplayPrice\.formatted[\s\S]*aria-hidden="true"[\s\S]*perNightLabel/,
  );
  assert.match(source, /text-lg font-bold[\s\S]*tabular-nums[\s\S]*sm:text-xl/);
  assert.match(source, /text-xs[\s\S]*text-slate-500/);
});

test("hotel result cards use a single mobile amenity column and bottom conversion cluster", () => {
  assert.ok(source.includes("expandedAmenityItems.slice(0, 4)"));
  assert.ok(source.includes("items={collapsedAmenityItems}"));
  assert.match(
    source,
    /data-hotel-card-amenities[\s\S]*grid-cols-1[\s\S]*md:grid-cols-2[\s\S]*data-hotel-card-price[\s\S]*data-hotel-card-action[\s\S]*href=\{resolvedDetailsHref\}/,
  );
  assert.match(source, /className="mt-auto pt-2 md:pt-3"/);

  for (const layoutHack of [
    "self-center -translate-y",
    "data-hotel-card-trailing-amenity",
  ]) {
    assert.ok(!source.includes(layoutHack), `unexpected ${layoutHack}`);
  }
});

test("hotel result cards expose compact save and share actions with feedback", () => {
  assert.match(source, /Share2/);
  assert.match(source, /shareStatus === "shared"/);
  assert.match(source, /\$\{hotel\.name\} shared/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(
    source,
    /new URL\(resolvedDetailsHref, window\.location\.origin\)/,
  );
  assert.match(source, /AbortError/);
});

test("mobile hotel utility actions sit at the card edge without entering the hotel name", () => {
  assert.match(
    source,
    /className="relative min-w-0"[\s\S]*?pe-\[88px\][\s\S]*?data-hotel-utility-actions[\s\S]*?absolute -end-3 -top-2/,
  );
  assert.match(
    source,
    /data-hotel-utility-actions[\s\S]*?renderSaveButton\("flex pe-1", "justify-end"\)[\s\S]*?renderShareButton\("flex ps-1", "justify-start"\)/,
  );
  assert.equal(
    source.match(/min-h-11 min-w-11/g)?.length,
    2,
    "save and share helpers each preserve a 44px minimum target",
  );
  assert.doesNotMatch(source, /translate-x-0\.5/);
  assert.doesNotMatch(source, /-translate-x-0\.5/);
  assert.match(source, /horizontalAlignment = "justify-center"/);
});

test("hotel result cards use whitespace instead of internal rules", () => {
  assert.doesNotMatch(source, /border-t border-slate-200/);
  assert.doesNotMatch(source, /border-s border-slate-200/);
  assert.match(source, /min-h-11[\s\S]*rounded-lg[\s\S]*shadow-none/);
});

test("hotel details actions distinguish omitted, valid, and unavailable destinations", () => {
  assert.match(source, /detailsHref\?: string \| null/);
  assert.match(
    source,
    /detailsHref === undefined\s*\? `\/hotels\/details\/\$\{encodeURIComponent\(hotel\.id\)\}`\s*:\s*detailsHref/,
  );
  assert.match(source, /resolvedDetailsHref === null \? \(/);
  assert.match(source, /<Button[\s\S]*?disabled[\s\S]*?unavailableActionLabel/);
  assert.match(source, /<LinkButton[\s\S]*?href=\{resolvedDetailsHref\}/);
  assert.doesNotMatch(source, /detailsHref\s*\|\|\s*`\/hotels\/details/);
});

test("standalone Hotel actions and attribution retain their link fallbacks", () => {
  assert.match(source, /t\("hotelResults\.viewHotel"\) \|\| "View hotel"/);
  assert.match(source, /allowExternalAttribution\s*&&\s*isSafeHttpUrl/);
  assert.match(source, /<a\s+href=\{attribution\.providerUri\}/);
});
