import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync(
  new URL("./hotelDetails/MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);
const gallery = readFileSync(
  new URL("./hotelDetails/HotelDetailsMobile.module.css", import.meta.url),
  "utf8",
);
const nav = readFileSync(
  new URL("./hotelDetails/HotelDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("./hotelDetails/DesktopHotelDetails.tsx", import.meta.url),
  "utf8",
);

test("standalone mobile Hotel details follow hero, identity, tabs, then content", () => {
  const hero = details.indexOf("data-mobile-hotel-hero");
  const identity = details.indexOf("className={styles.identity}");
  const tabs = details.indexOf("className={styles.tabs}");
  const panel = details.indexOf("className={styles.panel}");
  assert.ok(hero >= 0 && hero < identity);
  assert.ok(identity < tabs);
  assert.ok(tabs < panel);
  assert.match(details, /role="tablist" aria-label="Hotel details"/);
  assert.match(gallery, /\.tabs \{[^}]*position: sticky; top: 0/);
});

test("mobile Hotel hero owns Back, Save, and Share while desktop keeps its accessible Back link", () => {
  assert.match(details, /className=\{styles.actions\}/);
  assert.match(details, /aria-label="Back to hotel results"/);
  assert.match(details, /aria-pressed=\{props\.isSaved\}/);
  assert.match(details, /<Heart[\s\S]*?onClick=\{\(\) => void share\(\)\}/);
  assert.match(client, /href=\{props.resultsHref\}[\s\S]*aria-label=\{props.labels.backToResults\}/);
  assert.match(client, /data-standalone-hotel-back-link/);
});

test("standalone mobile Hotel gallery is full bleed without inline thumbnails", () => {
  assert.match(gallery, /\.hero \{[^}]*width: 100%;[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory/);
  assert.match(details, /gallery\.usableIndices\.map/);
  assert.doesNotMatch(details, /data-hotel-mobile-thumbnail-strip|mobileThumbnailIndices|mobileRemainingCount/);
  assert.match(details, /gallery.activePosition} \/ {gallery.usableIndices\.length}/);
  assert.match(details, /setOverlay\("gallery"\)/);
  assert.match(details, /<DetailsDialog/);
});

test("desktop Hotel detail navigation now matches the shared Rates, Overview, Reviews structure", () => {
  for (const label of ["Rates", "Overview", "Reviews"]) {
    assert.match(nav, new RegExp(`label: "${label}"`));
  }
  assert.match(nav, /grid-cols-3/);
  assert.match(nav, /text-\[13px\] font-bold[\s\S]*sm:text-sm/);
  assert.doesNotMatch(nav, /desktopOnly|mobileLabel|id: "location"|matchMedia/);
});
