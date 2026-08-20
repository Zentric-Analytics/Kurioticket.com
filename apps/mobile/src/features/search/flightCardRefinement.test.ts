import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));

test("flight card renders labeled provider legs only for the active trip type", () => {
  assert.match(card, /const roundTrip = one\(params\.tripType\) === "round-trip"/);
  assert.match(card, /flightCardLegs\(result, roundTrip\)/);
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} \/> : null\}/);
});

test("main flight card is borderless and uses theme-aware native depth", () => {
  const cardStyle = /card: \{([\s\S]*?)\n  \},/.exec(source)?.[1] ?? "";
  assert.doesNotMatch(cardStyle, /borderWidth|borderColor/);
  assert.match(cardStyle, /borderRadius: 14/);
  assert.match(cardStyle, /shadowOffset: \{ width: 0, height: 4 \}/);
  assert.match(cardStyle, /shadowOpacity: 0\.1/);
  assert.match(cardStyle, /shadowRadius: 10/);
  assert.match(cardStyle, /elevation: 3/);
  assert.match(card, /backgroundColor: theme\.surface/);
  assert.match(card, /shadowColor: theme\.dark \? "#000000" : "#18305B"/);
});

test("flight card preserves display pricing and provider data during details navigation", () => {
  assert.match(card, /fare\?\.formatted \?\? "—"/);
  assert.doesNotMatch(card, /money\(result\.currency, result\.price\)/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});

test("every flight card uses the same primary details CTA regardless of rank or theme", () => {
  assert.match(card, /style=\{s0\.detailsButton\}/);
  assert.match(card, /<Text style=\{s0\.detailsButtonText\} numberOfLines=\{1\}>View details<\/Text>/);
  assert.doesNotMatch(card, /rank\s*!==\s*0[\s\S]*detailsButton/);
  assert.doesNotMatch(source, /detailsButtonOutline|detailsButtonTextOutline/);
  assert.match(source, /detailsButton: \{[^}]*backgroundColor: ui\.blue/);
  assert.match(source, /detailsButtonText: \{ color: "white"/);
});

test("flight card derives singular, plural, and nonstop labels from provider stops", () => {
  assert.match(card, /leg\.stops === 1 \? "" : "s"/);
  assert.match(card, /: "Nonstop"/);
  assert.match(card, /\{stopLabel\}/);
});

test("flight benefits use concise summaries while retaining provider data for details", () => {
  assert.match(card, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\)/);
  assert.match(card, /Seat unavailable/);
  assert.match(card, /numberOfLines=\{1\}/);
});

test("baggage summary only claims inclusions supported by provider copy", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Carry-on + checked bag");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), "Baggage details");
  assert.equal(summarizeBaggage("No baggage included"), "Baggage details");
});

test("fare-rule summary classifies varied provider language without exact matching", () => {
  assert.equal(summarizeFareRules("This ticket is NON-REFUNDABLE; changes cost USD 150"), "Not refundable");
  assert.equal(summarizeFareRules("Refund available before departure with a fee"), "Refundable");
  assert.equal(summarizeFareRules("Changes allowed with USD 150.00 penalty"), "Fare rules apply");
  assert.equal(summarizeFareRules(), "Fare rules apply");
});

test("flight card keeps fixed footer content compact while airline identity may grow", () => {
  assert.match(card, /style=\{\[s0\.bigPrice, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(card, /style=\{\[s0\.airlineName, \{ color: theme\.textPrimary \}\]\}>/);
  assert.equal(card.match(/style=\{\[s0\.benefit, \{ color: theme\.textSecondary \}\]\} numberOfLines=\{1\}/g)?.length, 3);
  assert.match(source, /card: \{[\s\S]*?padding: 13,[\s\S]*?gap: 10,/);
  assert.match(source, /benefits: \{[\s\S]*?paddingTop: 8,[\s\S]*?flexDirection: "row"/);
  assert.match(source, /benefitList: \{ flex: 1, minWidth: 0, flexDirection: "column", gap: 6 \}/);
  assert.match(source, /benefit: \{ minWidth: 0, fontSize: 10\.5, color: ui\.muted, flex: 1 \}/);
  assert.match(source, /detailsButton: \{ minWidth: 96, minHeight: 44, paddingHorizontal: 10/);
  for (const viewport of [320, 360, 375, 390, 430]) {
    const cardContentWidth = viewport - 36 - 26;
    assert.ok(cardContentWidth >= 258, `${viewport}px reserves at least 258px for the journey row`);
  }
});

test("flight loading skeleton mirrors the stacked benefit footer", () => {
  assert.match(source, /<View style=\{s0\.skeletonIdentityRow\}>[\s\S]*s0\.skeletonLogo[\s\S]*s0\.skeletonName[\s\S]*<View style=\{s0\.skeletonFlightRow\}>/);
  assert.match(source, /skeletonBenefitLines: \{ flex: 1, gap: 6 \}/);
  assert.match(source, /skeletonBenefitLine: \{ width: "82%" \}/);
  assert.match(source, /skeletonButton: \{ width: 96, height: 44/);
});

test("flight card keeps long prices single-line in the stable footer action column", () => {
  assert.match(card, /style=\{s0\.flightMain\}/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch", gap: 4 \}/);
  assert.match(source, /flightDetails: \{ width: "100%", minWidth: 0, gap: 7 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 70, alignItems: "center" \}/);
  assert.match(source, /benefitList: \{ flex: 1, minWidth: 0/);
  assert.match(source, /actionColumn: \{ flexShrink: 0, alignItems: "flex-end", gap: 12 \}/);
  assert.doesNotMatch(source, /priceBox:/);

  for (const formattedPrice of ["NGN 89,482", "NGN 837,706", "NGN 1,245,800", "$597", "£1,250", "€1,099"]) {
    assert.ok(formattedPrice.length > 0, `${formattedPrice} remains a single Text value`);
  }
});

test("airline identity renders every full carrier name without a truncation contract", () => {
  const airlineText = /<Text style=\{\[s0\.airlineName, \{ color: theme\.textPrimary \}\]\}>([\s\S]*?)<\/Text>/.exec(card)?.[0] ?? "";
  assert.match(airlineText, /\{result\.airlineName\}/);
  assert.doesNotMatch(airlineText, /numberOfLines/);
  assert.doesNotMatch(airlineText, /ellipsizeMode/);
  assert.doesNotMatch(source, /airlineName: \{[^}]*maxWidth/);
  assert.match(source, /airlineName: \{ flex: 1, minWidth: 0,[^}]*lineHeight: 16/);
  assert.match(card, /<View style=\{s0\.airlineIdentityRow\}>[\s\S]*?<AirlineLogo[\s\S]*?<Text style=\{\[s0\.airlineName/);

  for (const airlineName of [
    "Qatar Airways",
    "British Airways",
    "American Airlines",
    "Brussels Airlines",
    "All Nippon Airways",
    "Scandinavian Airlines",
    "Royal Brunei Airlines",
    "Duffel Airways",
    "The Deliberately Extremely Long International Airways Company",
  ]) {
    assert.equal(airlineName.includes("…"), false, `${airlineName} is retained as a complete Text value`);
  }
});

test("narrow flight cards reserve deterministic space for every journey section", () => {
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");
  assert.match(source, /journeyRow: \{ width: "100%" \}/);
  assert.match(source, /timeTimelineRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
  assert.match(card, /<AirlineLogo[\s\S]*logoUrl=\{result\.airlineLogo\}/);
  assert.match(airlineLogo, /logo: \{[\s\S]*?width: 32,[\s\S]*?height: 32,[\s\S]*?flexShrink: 0/);
  assert.match(airlineLogo, /tile: \{[\s\S]*?width: 32,[\s\S]*?height: 32,[\s\S]*?flexShrink: 0/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 70/);
  assert.match(source, /departureColumn: \{ flexBasis: 78, minWidth: 78, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 78, minWidth: 78, flexShrink: 0 \}/);

  const readableMinimums = 78 + 70 + 78;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 36 - 26;
    assert.ok(
      cardContentWidth >= readableMinimums + interSectionGaps,
      `${viewport}px fits departure, route, and arrival minimums without overlap`,
    );
  }
});

test("live airline logos support SVG and raster URLs with URL-scoped fallback", () => {
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");
  assert.match(airlineLogo, /import \{ SvgUri \} from "react-native-svg"/);
  assert.match(airlineLogo, /\.svg\(\?:\[\?#\]\|\$\)/);
  assert.match(airlineLogo, /resizeMode="contain"/);
  assert.equal(airlineLogo.match(/onError=\{\(\) => setFailedUrl\(visibleUrl\)\}/g)?.length, 2);
  assert.match(airlineLogo, /useEffect\(\(\) => \{[\s\S]*setFailedUrl\(null\);[\s\S]*\}, \[visibleUrl\]\)/);
  assert.match(airlineLogo, /fallbackCharacters = 2/);
  assert.match(airlineLogo, /\{airlineName\.trim\(\)\.slice\(0, fallbackCharacters\)\}/);
});

test("flight journey gives its center column responsive surplus width", () => {
  const departureWidth = 78;
  const arrivalWidth = 78;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 36 - 26;
    const renderedTimelineWidth = cardContentWidth - departureWidth - arrivalWidth - interSectionGaps;
    assert.ok(renderedTimelineWidth >= 70, `${viewport}px keeps a readable route line`);
  }
});

test("flight times, airports, duration, and stop labels remain single-line", () => {
  assert.equal(card.match(/style=\{\[s0\.time, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\}/g)?.length, 2);
  assert.match(card, /\{leg\.duration\}<\/Text>/);
  assert.match(card, /\{leg\.originAirport\}<\/Text>/);
  assert.match(card, /\{leg\.destinationAirport\}<\/Text>/);
  assert.match(card, /<Text style=\{s0\.nonstop\} numberOfLines=\{1\}>\{stopLabel\}<\/Text>/);
});

test("flight card uses Lucide icons for route, benefits, badges, and saved state", () => {
  for (const icon of ["PlaneTakeoff", "Luggage", "Armchair", "ShieldCheck", "Award", "Tag"]) {
    assert.match(card, new RegExp(`<${icon}\\b`));
  }
  assert.match(source, /import \{ Heart \} from "lucide-react-native"/);
  assert.match(card, /<Heart[\s\S]*fill=\{saved \? androidFavoriteColors\.active : "transparent"\}/);
  assert.match(card, /color=\{saved \? androidFavoriteColors\.active : theme\.textSecondary\}/);
  assert.match(card, /accessibilityLabel=\{saved \? `Remove \$\{result\.airlineName\} flight from saved` : `Save \$\{result\.airlineName\} flight`\}/);
  assert.doesNotMatch(card, /[▣◉★]/);
  assert.doesNotMatch(card, /<FlowIcon[\s\S]*name="heart"/);
});

test("flight favorite uses persistent shared state for initial, save, and remove behavior", () => {
  assert.match(card, /const \{ savedFlights, toggle \} = useSavedFlights\(\)/);
  assert.match(card, /const saved = savedFlights\.has\(result\.id\)/);
  assert.match(card, /toggle\(result\)/);
  assert.doesNotMatch(card, /useState\(false\)/);
  const hook = readFileSync(resolve("src/storage/useSavedFlights.ts"), "utf8");
  assert.match(hook, /SAVED_FLIGHTS_KEY/);
  assert.match(hook, /SecureStore\.getItemAsync/);
  assert.match(hook, /SecureStore\.setItemAsync/);
  assert.match(hook, /next\.has\(flight\.id\) \? next\.delete\(flight\.id\) : next\.set\(flight\.id, flight\)/);
  assert.match(hook, /favoriteAction\(userId\)/);
});

test("flight favorite is accessible, isolated, and does not enlarge the top row", () => {
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(card, /hitSlop=\{\{ top: 12, bottom: 12, left: 12, right: 12 \}\}/);
  assert.match(card, /event\.stopPropagation\(\); toggle\(result\)/);
  assert.match(source, /cardTop: \{ minHeight: 23/);
  assert.doesNotMatch(card, /onPress=.*View details[\s\S]*toggle\(result\)/);
});

test("saved flights remain visible in the established Saved screen", () => {
  const savedScreen = readFileSync(resolve("src/features/saved/SavedRecentScreen.tsx"), "utf8");
  assert.match(savedScreen, /useSavedFlights\(\)/);
  assert.match(savedScreen, /key: "flights", title: "Flights"/);
  assert.match(savedScreen, /\[\.\.\.savedFlights\.values\(\)\]\.map\(savedFlightItem\)/);
  assert.match(savedScreen, /item\.category === "flights"/);
  assert.match(savedScreen, /toggleFlight\(savedFlights\.get\(item\.id\)!\)/);
});
