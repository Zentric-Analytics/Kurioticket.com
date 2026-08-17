import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchBarSource = readFileSync(
  new URL("./HotelSearchBar.tsx", import.meta.url),
  "utf8",
);
const hotelsPageSource = readFileSync(
  new URL("../../app/hotels/page.tsx", import.meta.url),
  "utf8",
);
const homepageSource = readFileSync(
  new URL("../../app/page.tsx", import.meta.url),
  "utf8",
);
const resultsSource = readFileSync(
  new URL("../results/HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("the hotels landing page opts into the isolated mobile presentation", () => {
  const mobileHotelSearch = hotelsPageSource.slice(
    hotelsPageSource.indexOf('<section className="relative z-20 isolate'),
    hotelsPageSource.indexOf('<section className="relative z-20 hidden'),
  );
  const desktopHotelSearch = hotelsPageSource.slice(
    hotelsPageSource.indexOf('<section className="relative z-20 hidden'),
    hotelsPageSource.indexOf('aria-labelledby="hotel-destinations-heading"'),
  );

  assert.match(mobileHotelSearch, /mobileLandingPresentation/);
  assert.match(mobileHotelSearch, /!rounded-\[15px\]/);
  assert.doesNotMatch(mobileHotelSearch, /!rounded-\[1\.5rem\]/);
  assert.doesNotMatch(desktopHotelSearch, /mobileLandingPresentation/);
  assert.match(desktopHotelSearch, /!rounded-\[14px\]/);
  assert.match(desktopHotelSearch, /lg:.*!rounded-\[16px\]/);
  assert.doesNotMatch(desktopHotelSearch, /!rounded-\[1\.75rem\]/);
});

test("mobile landing destination uses MapPin without its former chevron and keeps the picker launcher", () => {
  const destinationLauncher = searchBarSource.slice(
    searchBarSource.indexOf("ref={destinationMobileLauncherRef}"),
    searchBarSource.indexOf(
      "<input",
      searchBarSource.indexOf("ref={destinationMobileLauncherRef}"),
    ),
  );

  assert.match(destinationLauncher, /setDestinationMobilePickerOpen\(true\)/);
  assert.match(destinationLauncher, /mobileLandingPresentation \? \(/);
  assert.match(destinationLauncher, /<MapPin/);
  assert.match(destinationLauncher, /h-4 w-4 shrink-0 text-slate-500/);
  assert.ok(
    destinationLauncher.indexOf("<MapPin") <
      destinationLauncher.indexOf('t("hotelSearchDestinationPlaceholder")'),
  );
  assert.match(destinationLauncher, /\) : \(\s*<>[\s\S]*<ChevronDown/);
  assert.match(searchBarSource, /launcherRef=\{destinationMobileLauncherRef\}/);
});

test("landing value rows retain Calendar and add UserRound while keeping the guests chevron", () => {
  const datesLauncher = searchBarSource.slice(
    searchBarSource.indexOf("ref={datesMobileLauncherRef}"),
    searchBarSource.indexOf(
      "{datesOpen ?",
      searchBarSource.indexOf("ref={datesMobileLauncherRef}"),
    ),
  );
  const guestsLauncher = searchBarSource.slice(
    searchBarSource.indexOf("ref={guestsRoomsMobileLauncherRef}"),
    searchBarSource.indexOf(
      "{guestsRoomsOpen ?",
      searchBarSource.indexOf("ref={guestsRoomsMobileLauncherRef}"),
    ),
  );

  assert.ok(
    datesLauncher.indexOf("<Calendar") < datesLauncher.indexOf("{dateSummary}"),
  );
  assert.ok(
    guestsLauncher.indexOf("<UserRound") <
      guestsLauncher.indexOf("{guestsRoomsSummary}"),
  );
  assert.ok(
    guestsLauncher.indexOf("{guestsRoomsSummary}") <
      guestsLauncher.indexOf("<ChevronDown"),
  );
});

test("landing hotel identity is moderately enlarged without changing other consumers", () => {
  const mobileIdentity = searchBarSource.slice(
    searchBarSource.indexOf("{!compact && desktopIdentityLabel ? ("),
    searchBarSource.indexOf(
      "{!compact && desktopIdentityLabel ? (",
      searchBarSource.indexOf("{!compact && desktopIdentityLabel ? (") + 1,
    ),
  );

  assert.match(mobileIdentity, /mobileLandingPresentation/);
  assert.match(mobileIdentity, /gap-2 py-2 text-\[16px\]/);
  assert.match(mobileIdentity, /h-5 w-5/);
  assert.match(mobileIdentity, /text-\[0\.86rem\]/);
  assert.match(mobileIdentity, /h-4 w-4/);
  assert.doesNotMatch(resultsSource, /mobileLandingPresentation/);
  assert.doesNotMatch(homepageSource, /mobileLandingPresentation/);
  assert.doesNotMatch(homepageSource, /<HotelSearchBar/);
});

test("mobile hotel landing omits the active-search reset surface while preserving desktop reset", () => {
  assert.match(
    searchBarSource,
    /!compact && !mobileLandingPresentation && hasActiveHotelSearch/,
  );
  assert.match(searchBarSource, /onClick=\{handleResetSearch\}/);
  assert.match(searchBarSource, /<RotateCcw/);
  assert.match(searchBarSource, /\{t\("clearAll"\)\}/);
});

test("hotel hero is text-free with one screen-reader-accessible page heading", () => {
  const mobileHero = hotelsPageSource.slice(
    hotelsPageSource.indexOf('<section className="relative z-20 isolate'),
    hotelsPageSource.indexOf('<section className="relative z-20 hidden'),
  );
  const desktopHero = hotelsPageSource.slice(
    hotelsPageSource.indexOf('<section className="relative z-20 hidden'),
    hotelsPageSource.indexOf('aria-labelledby="hotel-destinations-heading"'),
  );

  assert.doesNotMatch(
    mobileHero,
    /hotelsHeroMobileTitle|hotelsHeroMobileSubtitle/,
  );
  assert.doesNotMatch(desktopHero, /hotelsHeroTitle|hotelsHeroSubtitle/);
  assert.equal((hotelsPageSource.match(/<h1\b/g) ?? []).length, 1);
  assert.match(
    hotelsPageSource,
    /<h1 className="sr-only">\{t\("hotelsHeroTitle"\)\}<\/h1>/,
  );
});
