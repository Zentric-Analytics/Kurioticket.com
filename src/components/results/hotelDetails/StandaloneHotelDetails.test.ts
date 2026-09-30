import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const dispatcher = read("./StandaloneHotelDetails.tsx");
const desktop = read("./DesktopHotelDetails.tsx");
const mobile = read("./MobileHotelDetails.tsx");
const mobileCss = read("./HotelDetailsMobile.module.css");
const client = read("../HotelDetailsClient.tsx");
const page = read("../../../app/hotels/details/[id]/page.tsx");
const gallery = read("./HotelDetailsGallery.tsx");
const stayEditor = read("./DesktopHotelStayEditor.tsx");

test("standalone chooses independent mobile and desktop presentations with shared data", () => {
  assert.match(dispatcher, /useSyncExternalStore/);
  assert.match(dispatcher, /max-width: 1023px/);
  assert.match(dispatcher, /return mobile \? <MobileHotelDetails \{\.\.\.props\} \/> : <DesktopHotelDetails \{\.\.\.props\} \/>/);
  assert.match(dispatcher, /removeEventListener\("change", callback\)/);
  assert.doesNotMatch(dispatcher, /<article|<aside|<h1/);
});

test("canonical result name and save state reach both property presentations", () => {
  assert.match(client, /<StandaloneHotelDetails[\s\S]*?hotelName=\{hotel\.name\}/);
  for (const source of [desktop, mobile]) {
    assert.match(source, /<h1[^>]*>\{props\.hotelName\}<\/h1>/);
    assert.match(source, /aria-pressed=\{props\.isSaved\}/);
    assert.match(source, /onClick=\{props\.onSave\}/);
    assert.match(source, /navigator\.share/);
    assert.match(source, /navigator\.clipboard\.writeText/);
    assert.doesNotMatch(source, /hotelName\.(?:slice|split|replace)/);
  }
});

test("mobile gallery preserves real photo positions, navigation and image error handling", () => {
  for (const contract of ["gallery.usableIndices.map", "gallery.activePosition} / {gallery.usableIndices.length", "gallery.onSelectImage", "gallery.onImageError", 'setOverlay("gallery")', 'setOverlay("photo")', "gallery.onPrevious", "gallery.onNext"]) assert.ok(mobile.includes(contract), contract);
  assert.match(mobile, /gallery\.imageUnavailableText/);
  assert.doesNotMatch(mobile, /1 \/ 29|\+25/);
  const hero = mobile.slice(mobile.indexOf("data-mobile-hotel-hero"), mobile.indexOf("className={styles.identity}"));
  assert.doesNotMatch(hero, /preventDefault/);
  assert.doesNotMatch(mobileCss, /touch-action\s*:\s*(?:none|pan-x)\s*[;}]/);
});

test("desktop gallery exposes available photos and opens the shared accessible viewer", () => {
  assert.match(desktop, /<HotelDetailsGallery[\s\S]*?layout="desktop"/);
  const desktopGallery = gallery.slice(gallery.indexOf("const desktopGallery = ("), gallery.indexOf("const mosaic = ("));
  assert.match(desktopGallery, /desktopIndices\.map/);
  assert.match(desktopGallery, /desktopIndices\.length === 1/);
  assert.match(desktopGallery, /onSelectImage\(imageIndex\)/);
  assert.match(desktopGallery, /openViewer\(event\.currentTarget\)/);
  assert.match(desktopGallery, /onImageError\(url\)/);
  assert.match(desktopGallery, /viewAllPhotosLabel/);
  assert.match(desktopGallery, /imageUnavailableText/);
  assert.match(gallery, /<HotelDetailsGalleryDialog/);
});

test("mobile booking dock follows selection and hides when no rates exist", () => {
  assert.match(mobile, /const selected = offers\.find/);
  assert.match(mobile, /formatMobileHotelPrice\(props\.totalDisplayPrice/);
  assert.match(mobile, /if \(pending\) return/);
  assert.match(mobile, /offer\.action\.kind === "internal-room-flow"/);
  assert.match(mobile, /props\.onProviderOfferHandoff\?\.\(offer\.action\.providerOfferId, providerWindow\)/);
  assert.match(mobile, /finally \{ setPending\(false\); \}/);
  assert.match(mobile, /No rates available/);
  assert.match(mobile, /role="alert"/);
  assert.match(mobileCss, /safe-area-inset-bottom/);
});

test("native dialogs release scroll locks and restore focus on every close path", () => {
  for (const source of [desktop, mobile]) {
    assert.match(source, /dialog\?\.showModal\(\)/);
    assert.match(source, /dialog\?\.close\(\)/);
    assert.match(source, /document\.body\.style\.overflow = "hidden"/);
    assert.match(source, /document\.body\.style\.overflow = (?:previousOverflow|overflow)/);
    assert.match(source, /opener\?\.focus\(\{ preventScroll: true \}\)/);
    assert.match(source, /onCancel=/);
    assert.match(source, /event\.target (?:===|!==) event\.currentTarget/);
    assert.match(source, /aria-label=\{`Close \$\{title\}`\}/);
  }
  assert.match(desktop, /event\.currentTarget\.getBoundingClientRect\(\)/);
  assert.match(desktop, /event\.clientX < bounds\.left/);
  assert.match(desktop, /event\.clientY > bounds\.bottom/);
});

test("desktop stay editing validates dates and retains the current hotel route", () => {
  assert.match(desktop, /stayEditor=\{<DesktopHotelStayEditor context=\{context\} \/>\}/);
  assert.match(desktop, /const context = props\.relatedSearchContext/);
  assert.match(stayEditor, /parseHotelDetailsSearchDate\(draft\.checkIn\)/);
  assert.match(stayEditor, /parseHotelDetailsSearchDate\(draft\.checkOut\)/);
  assert.match(stayEditor, /!start \|\| start < localToday\(\)/);
  assert.match(stayEditor, /!end \|\| end <= start/);
  assert.match(stayEditor, /new URL\(window\.location\.href\)/);
  for (const field of ["checkIn", "checkOut", "guests", "rooms"]) assert.ok(stayEditor.includes(`url.searchParams.set("${field}"`), field);
  assert.match(stayEditor, /window\.location\.assign\(`\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`\)/);
  assert.doesNotMatch(stayEditor, /useRouter|router\.push/);
  assert.match(stayEditor, /parseHotelDetailsSearchCount\(context\?\.guests, 1, 12\)/);
  assert.match(stayEditor, /parseHotelDetailsSearchCount\(context\?\.rooms, 1, 6\)/);
});

test("route chrome and results links preserve navigation with the Results-style desktop footer", () => {
  assert.match(page, /<AppHeader[\s\S]*?hideDesktopTravelNav[\s\S]*?hideMobileCategoryTabs/);
  assert.match(page, /data-hotel-details-desktop-header/);
  assert.match(page, /data-hotel-details-desktop-footer>[\s\S]*?<Footer variant="brand-legal-only"\s*\/>/);
  assert.doesNotMatch(page, /<Footer className="bg-\[#f5f5f5\]"/);
  assert.equal(page.match(/<Footer\b/g)?.length, 1);
  assert.match(desktop, /href=\{props\.resultsHref\}[\s\S]*?data-standalone-hotel-back-link/);
  assert.doesNotMatch(client, /data-standalone-hotel-back-link/);
  assert.match(mobile, /href=\{props\.resultsHref\} aria-label="Back to hotel results"/);
});

test("client supplies both provider paths through the existing price and navigation pipelines", () => {
  for (const contract of ["totalDisplayPrice={totalDisplayPrice}", "nightlyDisplayPrice={nightlyDisplayPrice}", "resultsHref={resultsHref}", "staySummary={staySummary}", "relatedHotels={relatedHotels}", "roomOptions.map", "formatDisplayPrice"]) assert.ok(client.includes(contract), contract);
  assert.match(client, /providerOffers=\{standaloneProviderOffers\}/);
  assert.match(client, /onProviderOfferHandoff=\{/);
  assert.match(client, /await runProviderRedirect\(targetWindow\)/);
  assert.match(desktop, /props\.taxesText \|\| props\.planningPriceText/);
  assert.doesNotMatch(desktop + mobile, /1,248 reviews|Best price guarantee|Taxes and fees included/);
});

test("desktop rate continuation retains translated copy and the clicked offer", () => {
  assert.match(desktop, /continueLabel=\{props\.labels\.continueBooking\}/);
  assert.match(client, /continueBooking: t\("hotelDetails\.continueBooking"\) \|\| "Continue booking"/);
  assert.match(desktop, /onContinueOffer=\{\(id, trigger\) => void continueOffer\(id, trigger\)\}/);
  assert.doesNotMatch(desktop, /data-standalone-stay-summary|HotelDetailsGoogleMap|fillHeight/);
});


test("desktop external Hotel View deal reserves a new tab before the async provider redirect", () => {
  const continueStart = desktop.indexOf("async function continueOffer");
  const continueEnd = desktop.indexOf("const utilityActions", continueStart);
  const continueOffer = desktop.slice(continueStart, continueEnd);

  assert.match(continueOffer, /window\.open\("about:blank", "_blank"\)/);
  assert.match(continueOffer, /providerWindow\.opener = null/);
  assert.match(
    continueOffer,
    /onProviderOfferHandoff\(decision\.providerOfferId, providerWindow\)/,
  );
  assert.match(continueOffer, /providerWindow && !providerWindow\.closed/);
  assert.match(continueOffer, /providerWindow\.close\(\)/);
  assert.doesNotMatch(continueOffer, /window\.location\.href/);
});


test("standalone Hotel Details matches the Flight Details desktop page canvas", () => {
  assert.match(client, /<main className="flex-1 bg-white sm:bg-\[#f8fafc\] lg:bg-\[#F7F9FC\]">/);
  assert.match(desktopStyles, /\.desktop \{ color: #192024; background: #F7F9FC;/);
  assert.match(pageStates, /lg:bg-\[#F7F9FC\]/);
});
