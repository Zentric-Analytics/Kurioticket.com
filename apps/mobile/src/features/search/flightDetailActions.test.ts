import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { flightDetailHeaderModel } from "./flightDetailHeaderModel";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const searchUiSource = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const styles = detailSource.slice(detailSource.indexOf("const d = StyleSheet.create"));
const result = { originAirport: "lax", destinationAirport: "los", cabinClass: "business" };

test("Flight Details has a details-only two-row header without branding or a bell", () => {
  assert.match(flightDetail, /accessibilityLabel="Flight details header"/);
  assert.match(flightDetail, /accessibilityLabel="Flight route controls"[\s\S]*?accessibilityLabel="Trip metadata row"/);
  assert.doesNotMatch(flightDetail, /<TopBar|<Logo|Kurioticket|name="bell"|Price alert/);
  assert.match(searchUiSource, /export function Logo/);
  assert.match(searchUiSource, /accessibilityLabel="Notifications"/);
});

test("Back, Edit search, and Share remain independent accessible 44px actions", () => {
  assert.match(flightDetail, /accessibilityLabel="Go back" onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(flightDetail, /accessibilityLabel="Edit search" onPress=\{\(\) => router\.push\(\{ pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\) \}\)\}/);
  assert.match(flightDetail, /accessibilityLabel="Share flight" onPress=\{\(\) => void handleShare\(\)\}/);
  assert.match(flightDetail, /readSession,[\s\S]*?share: \(message\) => Share\.share\(\{ message \}\),[\s\S]*?message: flightShareMessage\(result, formattedFare\)/);
  assert.match(styles, /headerAction: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  const actionStyle = styles.slice(styles.indexOf("headerAction:"), styles.indexOf("headerActionPressed:"));
  assert.doesNotMatch(actionStyle, /backgroundColor|border|shadow|elevation/);
});

test("Edit search and Share form the right action group while the route is screen-centered", () => {
  assert.match(flightDetail, /accessibilityLabel="Flight details actions" style=\{d\.headerActions\}[\s\S]*?Edit search[\s\S]*?Share flight/);
  assert.match(styles, /headerActions: \{[\s\S]*?marginLeft: "auto"[\s\S]*?columnGap: 4/);
  assert.match(styles, /headerRoute: \{[\s\S]*?position: "absolute"[\s\S]*?left: 96,[\s\S]*?right: 96,[\s\S]*?textAlign: "center"/);
});

test("header model uses current airport codes, dates, passenger total, pluralization, and cabin", () => {
  assert.deepEqual(flightDetailHeaderModel(result, {
    tripType: "round-trip", departureDate: "2030-08-20", returnDate: "2030-08-22",
    adults: "1", children: "2", infants: "1", cabin: "Business",
  }), { route: "LAX ⇄ LOS", metadata: "Aug 20 – Aug 22 · 4 Travelers · Business" });
  assert.deepEqual(flightDetailHeaderModel(result, {
    tripType: "one-way", departureDate: "2030-08-20", adults: "1", children: "0", infants: "0", cabin: "premium-economy",
  }), { route: "LAX → LOS", metadata: "Aug 20 · 1 Traveler · Premium Economy" });
});

test("metadata is plain text, one line, horizontally scrollable, and themed", () => {
  assert.match(flightDetail, /<ScrollView accessibilityLabel="Trip metadata row" horizontal showsHorizontalScrollIndicator=\{false\}/);
  assert.match(flightDetail, /<Text numberOfLines=\{1\} style=\{\[d\.headerMetadata, \{ color: theme\.textSecondary \}]}>{header\.metadata}<\/Text>/);
  assert.doesNotMatch(flightDetail.slice(flightDetail.indexOf('accessibilityLabel="Trip metadata row"')), /Calendar|User|Briefcase|emoji/);
  assert.match(flightDetail, /backgroundColor: theme\.surface, borderBottomColor: theme\.border/);
  assert.match(flightDetail, /color: theme\.textPrimary/);
  assert.match(flightDetail, /color=\{theme\.icon\}/);
});

test("Flight Results and Flight Details booking body remain structurally unchanged", () => {
  assert.match(resultsSource, /function FlightResultsHeader/);
  assert.match(resultsSource, /<FlightResultsHeader/);
  assert.match(flightDetail, />Flight details</);
  assert.match(flightDetail, />Fare summary</);
  assert.match(flightDetail, />Choose where to book</);
  assert.match(flightDetail, /Continue to \$\{provider\}/);
  assert.match(flightDetail, /authoritativeProviderUrl\(result\)/);
});
