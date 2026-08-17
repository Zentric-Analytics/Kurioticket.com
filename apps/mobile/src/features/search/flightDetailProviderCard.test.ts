import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const offer = detailSource.slice(detailSource.indexOf("function Offer"), detailSource.indexOf("const d = StyleSheet.create"));

test("provider card switches to a stacked layout on narrow screens", () => {
  assert.match(offer, /useWindowDimensions\(\)\.width < 480/);
  assert.match(offer, /compact && d\.offerCompact/);
  assert.match(detailSource, /offerCompact: \{[\s\S]*?flexDirection: "column"/);
  assert.match(detailSource, /offerActionsCompact: \{[\s\S]*?flexDirection: "column"[\s\S]*?alignItems: "flex-end"[\s\S]*?gap: 6/);
  assert.doesNotMatch(detailSource, /offerActionsCompact: \{[^}]*flexWrap/);
});

test("provider identity keeps readable space and labels do not shrink into vertical text", () => {
  assert.match(detailSource, /providerIdentity: \{[\s\S]*?minWidth: 140/);
  assert.match(detailSource, /providerCopy: \{ flex: 1, minWidth: 97 \}/);
  assert.match(detailSource, /providerName: \{ flexShrink: 0 \}/);
  assert.match(detailSource, /recommended: \{ alignSelf: "flex-start", flexShrink: 0 \}/);
  assert.match(detailSource, /providerKind: \{ alignSelf: "flex-start", flexShrink: 0 \}/);
  assert.match(offer, /\{provider\}[\s\S]*?★ Recommended[\s\S]*?\{kind\}/);
});

test("responsive actions retain the displayed fare and Select behavior", () => {
  assert.match(offer, /<Text numberOfLines=\{1\} style=\{d\.priceSmall\}>\{price\}<\/Text>/);
  assert.match(offer, /<Button label="Select" \/>/);
  assert.match(offer, /\{price\}<\/Text>[\s\S]*?<Button label="Select" \/>/);
  assert.match(detailSource, /offerActions: \{[\s\S]*?flexDirection: "row"/);
  assert.match(flightDetail, /price=\{formattedFare\}/);
  assert.equal(flightDetail.match(/\{formattedFare\}/g)?.length, 3);
});

test("flight offer reuses a live carrier logo only for the same provider identity", () => {
  assert.match(flightDetail, /const providerLogoUrl =[\s\S]*?provider\.trim\(\)\.toLocaleLowerCase\(\) ===[\s\S]*?result\.airlineName\.trim\(\)\.toLocaleLowerCase\(\)[\s\S]*?\? result\.airlineLogo[\s\S]*?: null/);
  assert.match(flightDetail, /<Offer[\s\S]*?provider=\{provider\}[\s\S]*?logoUrl=\{providerLogoUrl\}[\s\S]*?price=\{formattedFare\}/);
  assert.match(offer, /<ProviderLogo provider=\{provider\} logoUrl=\{logoUrl\} \/>/);
});

test("provider booking redirect logic remains unchanged", () => {
  assert.match(flightDetail, /const url = result\.partnerRedirectUrl \|\| result\.bookingUrl/);
  assert.match(flightDetail, /await Linking\.openURL\(url\)/);
  assert.match(flightDetail, /<Button label=\{`Continue to \$\{provider\}`\} onPress=\{\(\) => void go\(\)\} \/>/);
});
