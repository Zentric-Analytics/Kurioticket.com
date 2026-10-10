import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const desktop = read("./DesktopHotelDetails.tsx");
const mobile = read("./MobileHotelDetails.tsx");
const compare = read("./HotelPriceComparisonSection.tsx");
const location = read("./HotelLocationSection.tsx");
const reviews = read("./HotelReviewsSection.tsx");
const relatedHotels = read("./RelatedHotelsSection.tsx");
const presentation = read("./hotelDetailsPresentation.ts");
const continuation = read("./hotelBookingContinuation.ts");

test("desktop has exactly Rates, Overview and Review anchor links for continuous navigation", () => {
  const declaration = desktop.slice(desktop.indexOf("const sections = ["), desktop.indexOf("] as const;"));
  const sections = [...declaration.matchAll(/\{ id: "([^"]+)", label: "([^"]+)" \}/g)].map(([, id, label]) => ({ id, label }));
  assert.deepEqual(sections, [{ id: "hotel-compare-prices", label: "Rates" }, { id: "hotel-overview", label: "Overview" }, { id: "hotel-reviews", label: "Review" }]);
  const navigation = desktop.slice(desktop.indexOf("<nav"), desktop.indexOf("</nav>"));
  assert.match(navigation, /aria-label="Hotel details sections"/);
  assert.match(navigation, /<a\b[^>]*href=\{`#\$\{section\.id\}`\}/);
  assert.match(navigation, /aria-current=\{activeSection === section\.id \? "location" : undefined\}/);
  assert.match(navigation, /goToSection\(section\.id\)/);
  assert.doesNotMatch(navigation, /tabIndex=|aria-selected=|aria-controls=/);
  assert.doesNotMatch(desktop, /role="tab(?:list|panel)?"|activeTab|setActiveTab/);
  for (const component of ["HotelPriceComparisonSection", "HotelReviewsSection", "HotelLocationSection", "RelatedHotelsSection"]) assert.equal(desktop.match(new RegExp(`<${component}\\b`, "g"))?.length, 1, component);
});

test("desktop keeps complete Rate, Overview and Review visible before standalone recommendations", () => {
  const rateStart = desktop.indexOf('<div data-desktop-section="rate">');
  const overviewStart = desktop.indexOf('<div data-desktop-section="overview">');
  const reviewStart = desktop.indexOf('data-desktop-section="review"');
  const relatedStart = desktop.indexOf('id="hotel-related-hotels"');
  assert.ok(rateStart >= 0 && overviewStart > rateStart && reviewStart > overviewStart && relatedStart > reviewStart);
  const rate = desktop.slice(rateStart, overviewStart);
  const overview = desktop.slice(overviewStart, reviewStart);
  const review = desktop.slice(reviewStart, relatedStart);
  const related = desktop.slice(relatedStart, desktop.indexOf('{overlay === "rooms" ?'));
  assert.doesNotMatch(overview + rate + review + related, /\bhidden(?:=|\s|>)|aria-hidden=|display:\s*"none"|activeSection\s*===/);
  for (const content of ["About this hotel", "<HotelLocationSection", "<HotelAmenityList", "Room &amp; comfort", "Accessibility"]) assert.ok(overview.includes(content), content);
  assert.doesNotMatch(overview, /<HotelPriceComparisonSection|<HotelReviewsSection/);
  assert.match(rate, /<HotelPriceComparisonSection/);
  assert.match(rate, /stayEditor=\{<DesktopHotelStayEditor context=\{context\} \/>\}/);
  assert.doesNotMatch(rate, /<HotelLocationSection|<HotelReviewsSection|<RelatedHotelsSection/);
  assert.match(review, /<HotelReviewsSection/);
  assert.doesNotMatch(review, /<HotelPriceComparisonSection|<HotelLocationSection|<RelatedHotelsSection/);
  assert.match(related, /<RelatedHotelsSection hotels=\{props\.relatedHotels\}/);
});

test("desktop recommendations retain their original heading and have no active navigation item", () => {
  assert.match(desktop, /props\.relatedHotels\.length \? <div id="hotel-related-hotels"/);
  assert.match(desktop, /relatedCity = property\?\.city \|\| context\?\.destination \|\| ""/);
  assert.match(desktop, /<RelatedHotelsSection[^>]*city=\{relatedCity\}[^>]*heading: props\.labels\.moreHotelsIn/);
  assert.match(desktop, /const related = document\.getElementById\("hotel-related-hotels"\)/);
  assert.match(desktop, /if \(related && related\.getBoundingClientRect\(\)\.top <= threshold\) current = null/);
  assert.match(desktop, /if \(!related &&[^\n]+scrollHeight[^\n]+current = sections\[sections\.length - 1\]\.id/);
  assert.match(desktop, /useState<DesktopHotelSection \| null>/);
});

test("desktop navigation follows scrolling and layout changes with cleanup", () => {
  assert.match(desktop, /window\.addEventListener\("scroll", schedule, \{ passive: true \}\)/);
  assert.match(desktop, /window\.addEventListener\("resize", schedule\)/);
  assert.match(desktop, /window\.requestAnimationFrame/);
  assert.match(desktop, /const barBounds = sectionBarRef\.current\?\.getBoundingClientRect\(\)/);
  assert.match(desktop, /const threshold = \(barBounds\?\.height \?\? 76\) \+ 24/);
  assert.match(desktop, /document\.getElementById\(section\.id\)\?\.getBoundingClientRect\(\)\.top/);
  assert.match(desktop, /setActiveSection\(current\)/);
  assert.match(desktop, /document\.documentElement\.scrollHeight[^\n]+current = sections\[sections\.length - 1\]\.id/);
  assert.match(desktop, /new ResizeObserver\(schedule\)/);
  assert.match(desktop, /observer\.observe\(detailsRef\.current\)/);
  for (const cleanup of ['window.removeEventListener("scroll", schedule)', 'window.removeEventListener("resize", schedule)', "window.cancelAnimationFrame(frame)", "observer.disconnect()"]) assert.ok(desktop.includes(cleanup), cleanup);
});

test("desktop section links and identity shortcuts scroll and focus with reduced-motion support", () => {
  const navigate = desktop.slice(desktop.indexOf("function goToSection("), desktop.indexOf("async function sharePage("));
  assert.match(navigate, /document\.getElementById\(id\)/);
  assert.match(navigate, /scrollIntoView/);
  assert.match(navigate, /prefers-reduced-motion: reduce/);
  assert.match(navigate, /\? "instant" : "smooth"/);
  assert.match(navigate, /const heading = target\?\.querySelector<HTMLElement>\("h2"\)/);
  assert.match(navigate, /heading\.tabIndex = -1; heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(desktop, /goToSection\("hotel-location"\)/);
  assert.match(desktop, /goToSection\("hotel-reviews"\)/);
  assert.match(desktop, /goToSection\("hotel-compare-prices"\)/);
});

test("mobile keeps independent keyboard-accessible rates, overview and reviews modes", () => {
  assert.match(mobile, /\["rates", "overview", "reviews"\]/);
  assert.match(mobile, /role="tablist"/);
  assert.match(mobile, /role="tabpanel"/);
  assert.match(mobile, /aria-selected=\{tab === item\}/);
  assert.match(mobile, /aria-controls=\{`mobile-hotel-\$\{item\}-panel`\}/);
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) assert.ok(mobile.includes(`"${key}"`), key);
  assert.match(mobile, /offsets\.current\[tab\] = window\.scrollY/);
});

test("desktop offers remain gated by genuine room choices and actionable provider data", () => {
  assert.match(desktop, /internalRoomFlowAvailable = props\.roomChoices\.length > 0/);
  assert.match(desktop, /internalRoomFlowAvailable \? \[internalOffer\] : \[\]/);
  assert.match(desktop, /props\.onProviderOfferHandoff \? \(props\.providerOffers \?\? \[\]\)\.filter\(isActionableExternalHotelProviderOffer\)/);
  assert.match(desktop, /buildKurioticketHotelDetailsProviderOffer/);
  assert.match(continuation, /kurioticket-logo-primary-light-bg\.svg/);
  assert.match(continuation, /action: \{ kind: "internal-room-flow" \}/);
  assert.doesNotMatch(desktop + compare, /Provider 2|Lowest price|Best deal|Compare 3 prices|1,248 reviews|Best price guarantee/);
});

test("desktop rate actions route the clicked offer and guard duplicate handoffs", () => {
  assert.match(desktop, /<HotelPriceComparisonSection variant="desktop"/);
  assert.match(desktop, /onContinueOffer=\{\(id, trigger\) => void continueOffer\(id, trigger\)\}/);
  assert.match(desktop, /resolveHotelBookingContinuation\(\{ selectedOfferId: offerId, offers, internalRoomFlowAvailable \}\)/);
  assert.match(desktop, /if \(handoffPending\.current\) return/);
  assert.match(desktop, /decision\.kind === "internal-room-flow"/);
  assert.match(desktop, /decision\.kind !== "provider-handoff"/);
  assert.match(desktop, /await props\.onProviderOfferHandoff\(decision\.providerOfferId, providerWindow\)/);
  assert.match(desktop, /finally \{[\s\S]*?handoffPending\.current = false;[\s\S]*?setPendingProviderOfferId\(null\);[\s\S]*?\}/);
  assert.match(desktop, /setProviderHandoffError/);
  assert.match(compare, /role="alert"/);
  assert.doesNotMatch(compare, /href=\{offer\.|window\.location/);
  assert.doesNotMatch(presentation, /deepLink/);
});

test("desktop rate section receives resolved selection and pending handoff state", () => {
  assert.match(desktop, /resolveSelectedHotelProviderOfferId\(\{ selectedOfferId, offers, internalRoomFlowAvailable \}\)/);
  assert.match(desktop, /offers=\{offers\} selectedOfferId=\{selectedId\}/);
  assert.match(desktop, /selectableOfferIds=\{new Set\(offers\.map\(offer => offer\.id\)\)\}/);
  assert.match(desktop, /onSelectOffer=\{setSelectedOfferId\}/);
  assert.match(desktop, /pendingOfferId=\{pendingProviderOfferId\}/);
  assert.match(desktop, /providerHandoffError=\{providerHandoffError\}/);
});

test("desktop overview and expanded amenities retain complete public property content", () => {
  for (const contract of ["property?.roomSummary", "property?.bedSummary", "property?.accessibility?.length", "property.accessibility.map", "props.amenityItems", "props.starRating"]) assert.ok(desktop.includes(contract), contract);
  assert.match(desktop, /mobileHotelAbout\(props\.hotelName, property, props\.starRating\)/);
  assert.match(mobile, /mobileHotelAbout\(props\.hotelName, property, props\.starRating\)/);
  assert.match(desktop, /<p>\{description\}<\/p>/);
  assert.doesNotMatch(desktop, /descriptionExpanded|line-clamp/);
  assert.match(desktop, /aria-expanded=\{allAmenities\}/);
  assert.match(mobile, /mobileHotelAmenityGroups\(props\.amenityItems\)/);
  assert.match(desktop, /Amenity details are not available yet/);
  assert.match(desktop, /hotels=\{props\.relatedHotels\}/);
  assert.match(desktop, /searchContext=\{props\.relatedSearchContext\}/);
});

test("desktop amenities expand as one continuous two-column list without changing the disclosure button", () => {
  const amenityList = desktop.indexOf("items={allAmenities ? props.amenityItems : props.amenityItems.slice(0, 10)}");
  const toggle = desktop.indexOf('Show fewer amenities');
  assert.ok(amenityList >= 0 && toggle > amenityList);
  assert.match(desktop, /allAmenities \? styles\.amenitiesExpanded/);
  assert.doesNotMatch(desktop, /mobileHotelAmenityGroups\(props\.amenityItems\.slice\(10\)\)|group\.title|items=\{group\.items\}/);
  assert.match(desktop, /className=\{styles\.secondaryButton\}/);
  assert.match(desktop, /aria-expanded=\{allAmenities\}/);
  assert.match(desktop, /props\.amenityItems\.length > 10/);
});

test("guest reviews use verified score, count, source and a missing-data state", () => {
  assert.match(reviews, /Boolean\(score && countText\)/);
  assert.match(reviews, /\{score\}/);
  assert.match(reviews, /\{countText\}/);
  assert.match(reviews, /Source: \{source\}/);
  assert.match(reviews, /Verified guest reviews are not connected/);
  assert.doesNotMatch(reviews, /8\.6|1,246|Excellent/);
  assert.match(desktop, /desktopHotelReviewScore\(props\.reviewScore, props\.mobileReviewScale\)/);
});

test("location and stay-fit facts use metadata without invented distances", () => {
  for (const field of ["neighbourhood", "businessSuitable", "familySuitable", "interestTags", "accessibility"]) assert.ok(desktop.includes(`locationProperty.${field}`), field);
  assert.match(desktop, /<HotelLocationSection variant="desktop"/);
  assert.match(location, /buildHotelMapEmbedUrl/);
  assert.match(location, /buildGoogleHotelStreetViewEmbedUrl/);
  assert.match(location, /Map preview unavailable/);
  assert.match(location, /stayFitFacts\.map/);
  assert.match(location, /accessibilityDetails\.map/);
  assert.match(location, /<iframe[\s\S]*?src=\{activeEmbedUrl\}[\s\S]*?loading="lazy"[\s\S]*?referrerPolicy="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(location, /target="_blank"/);
  assert.doesNotMatch(desktop + location, /\b\d+ min(?:ute)?s?\b|\b\d+ min walk\b/i);
});


test("desktop guest reviews stay compact without an empty guest-summary column", () => {
  assert.match(reviews, />Guest reviews<\/h2>/);
  assert.match(reviews, /data-desktop-hotel-review-overview/);
  assert.match(reviews, /max-w-\[520px\] items-center gap-5/);
  assert.match(reviews, /h-12 w-px shrink-0 bg-\[#d9dfe2\]/);
  assert.doesNotMatch(reviews, /Guests say|data-desktop-hotel-guests-say|Reviews of \$\{hotelName\}/);
  const reviewSection = desktop.slice(desktop.indexOf("<HotelReviewsSection"), desktop.indexOf("/>", desktop.indexOf("<HotelReviewsSection")) + 2);
  assert.doesNotMatch(reviewSection, /sentiment=|quotes=|hotelName=/);
});

test("desktop related hotels are capped at eight actual cards", () => {
  assert.match(desktop, /desktopLimit=\{8\} limit=\{8\}/);
  assert.match(relatedHotels, /const displayedHotels = hotels\.slice\(0, limit\)/);
});


test("desktop Hotel content from the hotel identity through recommendations sits on one white card", () => {
  const cardStart = desktop.indexOf("data-desktop-hotel-content-card");
  const identityStart = desktop.indexOf("<header className={styles.identity}>", cardStart);
  const galleryStart = desktop.indexOf("<HotelDetailsGallery", cardStart);
  const ratesStart = desktop.indexOf('data-desktop-section="rate"', cardStart);
  const overviewStart = desktop.indexOf('data-desktop-section="overview"', cardStart);
  const reviewStart = desktop.indexOf('data-desktop-section="review"', cardStart);
  const relatedStart = desktop.indexOf('id="hotel-related-hotels"', cardStart);
  const cardEnd = desktop.indexOf('{overlay === "rooms" ?', cardStart);

  assert.ok(cardStart >= 0);
  assert.ok(identityStart > cardStart);
  assert.ok(galleryStart > identityStart);
  assert.ok(ratesStart > galleryStart);
  assert.ok(overviewStart > ratesStart);
  assert.ok(reviewStart > overviewStart);
  assert.ok(relatedStart > reviewStart);
  assert.ok(cardEnd > relatedStart);
  assert.match(desktop, /className=\{styles\.contentCard\} data-desktop-hotel-content-card/);
});
