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
    "left-0 top-1/2",
    "right-0 top-1/2",
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
    assert.match(source, new RegExp(retainedContract.replace(".", "<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.")));
  }

  assert.match(
    source,
    /const showGalleryControls = availableImageIndices<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.length > 1;/,
  );
  assert.match(source, /<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{showGalleryControls <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden? <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*<>/);
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
    /data-hotel-card-mobile-grid[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[39%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/,
  );
  assert.match(
    source,
    /data-hotel-card-image[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*h-full[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*min-h-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[244px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/,
  );
  assert.match(source, /data-hotel-card-details/);
  assert.ok(!source.includes("h-[clamp(220px,58vw,250px)]"));
  assert.ok(!source.includes("h-[clamp(280px,78vw,340px)]"));
  assert.match(source, /md:grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[40%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(source, /lg:grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[clamp<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(280px,36%,340px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(source, /lg:max-w-none/);
});

test("desktop cards narrow only the details column and remain left aligned", () => {
  assert.match(
    source,
    /max-w-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[800px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*lg:mx-0 lg:max-w-none/,
  );
  assert.match(
    source,
    /md:grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[40%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*lg:grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[clamp<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(280px,36%,340px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/,
  );
  assert.match(source, /sizes="<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(min-width: 768px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden) 320px, 39vw"/);
  assert.match(source, /className="bg-slate-200 object-cover"/);
});

test("desktop hotel headings reserve two-line space for card-edge actions", () => {
  assert.match(source, /lg:pe-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[88px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(source, /lg:line-clamp-2/);
  assert.match(
    source,
    /data-hotel-desktop-utility-actions[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*absolute -end-3 -top-2[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*lg:flex/,
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
    assert.match(source, new RegExp(retainedContract.replace(".", "<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.")));
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
    "hotelResults.pricePerNight",
    "hotelResults.viewHotel",
  ]) {
    assert.ok(source.includes(retainedContract), `missing ${retainedContract}`);
  }
  assert.doesNotMatch(source, /totalDisplayPrice|estimated total for|estimated stay total/);
  assert.doesNotMatch(source, /catalogueProfile<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.propertyType|catalogueProfile<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.room<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.(?:name|bedConfiguration)/);
});

test("hotel result cards separate the nightly amount from its localized label", () => {
  assert.ok(
    source.includes(
      'const pricePerNightTemplate = t("hotelResults.pricePerNight")',
    ),
  );
  assert.match(
    source,
    /pricePerNightTemplate<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.replace<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden*price/,
  );
  assert.match(
    source,
    /aria-hidden="true"[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*nightlyDisplayPrice<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.formatted[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*aria-hidden="true"[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*perNightLabel/,
  );
  assert.match(source, /text-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[17px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden] font-bold[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*tabular-nums[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*min-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[390px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]:text-lg[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*sm:text-xl/);
  assert.match(source, /text-xs[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*text-slate-500/);
});

test("hotel result cards keep mobile amenities compact while desktop retains the fuller set", () => {
  assert.ok(source.includes("const mobileAmenityItems = expandedAmenityItems.slice(0, 3)"));
  assert.ok(source.includes("expandedAmenityItems.slice(0, 4)"));
  assert.ok(source.includes("items={mobileAmenityItems}"));
  assert.ok(source.includes("items={collapsedAmenityItems}"));
  assert.match(
    source,
    /data-hotel-card-amenities[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*grid-cols-1[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*md:grid-cols-2[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*data-hotel-card-price[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*data-hotel-card-action[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*href=<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{resolvedDetailsHref<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden}/,
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
  assert.match(source, /<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden$<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{hotel<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.name<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden} shared/);
  assert.match(source, /navigator<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.share/);
  assert.match(source, /navigator<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.clipboard<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.writeText/);
  assert.match(
    source,
    /new URL<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(resolvedDetailsHref, window<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.location<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.origin<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)/,
  );
  assert.match(source, /AbortError/);
});

test("mobile hotel utility actions sit at the card edge without entering the hotel name", () => {
  assert.match(
    source,
    /className="relative min-w-0"[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?pe-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[88px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?data-hotel-utility-actions[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?absolute -end-3 -top-2/,
  );
  assert.match(
    source,
    /data-hotel-utility-actions[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?renderSaveButton<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden("flex pe-1", "justify-end"<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?renderShareButton<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden("flex ps-1", "justify-start"<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)/,
  );
  assert.equal(
    source.match(/min-h-11 min-w-11/g)?.length,
    2,
    "save and share helpers each preserve a 44px minimum target",
  );
  assert.doesNotMatch(source, /translate-x-0<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5/);
  assert.doesNotMatch(source, /-translate-x-0<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5/);
  assert.match(source, /horizontalAlignment = "justify-center"/);
});

test("hotel result cards use whitespace instead of internal rules", () => {
  assert.doesNotMatch(source, /border-t border-slate-200/);
  assert.doesNotMatch(source, /border-s border-slate-200/);
  assert.match(source, /min-h-11[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*rounded-lg[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*shadow-none/);
});

test("hotel details actions distinguish omitted, valid, and unavailable destinations", () => {
  assert.match(source, /detailsHref<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden?: string <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden| null/);
  assert.match(
    source,
    /detailsHref === undefined<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden? `<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/hotels<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/details<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden$<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{encodeURIComponent<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(hotel<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.id<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden}`<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*:<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*detailsHref/,
  );
  assert.match(source, /resolvedDetailsHref === null <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden? <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(/);
  assert.match(source, /<Button[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?disabled[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?unavailableActionLabel/);
  assert.match(source, /<LinkButton[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?href=<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{resolvedDetailsHref<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden}/);
  assert.doesNotMatch(source, /detailsHref<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden|<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden|<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*`<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/hotels<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/details/);
});

test("standalone Hotel actions and attribution retain their link fallbacks", () => {
  assert.match(source, /t<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden("hotelResults<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.viewHotel"<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden) <Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden|<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden| "View hotel"/);
  assert.match(source, /allowExternalAttribution<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*&&<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens*isSafeHttpUrl/);
  assert.match(source, /<a<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens+href=<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden{attribution<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.providerUri<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden}/);
});

test("hotel galleries keep imagery edge-to-edge with unobtrusive edge controls", () => {
  assert.match(source, /data-hotel-card-image[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*overflow-hidden bg-slate-200/);
  assert.match(source, /className="bg-slate-200 object-cover"/);
  assert.match(source, /Previous photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*absolute left-0[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*h-11 w-11[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*bg-transparent text-white/);
  assert.match(source, /Next photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*absolute right-0[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*h-11 w-11[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*bg-transparent text-white/);
  assert.match(source, /ChevronLeft className="h-5 w-5 -translate-x-2<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5"/);
  assert.match(source, /ChevronRight className="h-5 w-5 translate-x-2<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5"/);
  assert.doesNotMatch(source, /bg-(?:white<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/95|slate-950<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/55)|rounded-full[^<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenn]*Previous photo/);
});


test("mobile Hotel result cards use a full-card destination with independent utilities", () => {
  assert.match(source, /<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden|<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden|<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/);
  assert.match(source, /data-hotel-utility-actions[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-20/);
  assert.match(source, /Previous photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-30/);
  assert.match(source, /Next photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-30/);
});

test("mobile Hotel cards keep provider provenance quiet and the View hotel action lightweight", () => {
  assert.match(source, /data-hotel-provider-label[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(source, /Source:[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(source, /relative z-20 inline-flex min-h-9[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?text-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[#004BB8<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(source, /hidden h-10 min-h-10[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?bg-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[#004BB8<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:inline-flex/);
});
