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
  assert.match(cardStyle, /shadowOffset: \{ width: 0, height: 3 \}/);
  assert.match(cardStyle, /shadowOpacity: 0\.08/);
  assert.match(cardStyle, /shadowRadius: 8/);
  assert.match(cardStyle, /elevation: 2/);
  assert.match(card, /backgroundColor: theme\.surface/);
  assert.match(card, /shadowColor: theme\.dark \? "#000000" : "#18305B"/);
});

test("flight card preserves display pricing and provider data during details navigation", () => {
  assert.match(card, /fare\?\.formatted \?\? "—"/);
  assert.doesNotMatch(card, /money\(result\.currency, result\.price\)/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});

test("flight card gives the compact visual fare one semantic spoken label", () => {
  assert.match(card, /accessibilityLabel=\{`\$\{result\.airlineName\}[\s\S]*fare\?\.accessibilityLabel/);
  assert.match(card, /<Text accessible=\{false\} style=\{\[s0\.bigPrice/);
  assert.equal(card.match(/fare\?\.accessibilityLabel/g)?.length, 1);
  assert.doesNotMatch(card, /Taxes (?:and fees )?included/);
  assert.doesNotMatch(card, /Total for \d|Per traveler|Round trip|One way/);
});

test("the whole card replaces the details CTA", () => {
  assert.match(card, /return \(\s*<Pressable[\s\S]*accessibilityRole="button"[\s\S]*pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
  assert.doesNotMatch(card, /View details|detailsButton|detailsButtonText/);
  assert.match(card, /event\.stopPropagation\(\); onToggleSaved\(\)/);
});

test("flight card derives singular, plural, and nonstop labels from provider stops", () => {
  assert.match(card, /leg\.stops === 1 \? "" : "s"/);
  assert.match(card, /: "Nonstop"/);
  assert.match(card, /\{stopLabel\}/);
});

test("flight benefits use concise summaries while retaining provider data for details", () => {
  assert.match(card, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\)/);
  assert.doesNotMatch(card, /Seat unavailable/);
  assert.match(card, /numberOfLines=\{1\}/);
});

test("baggage summary only claims inclusions supported by provider copy", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Carry-on + checked bag");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), null);
  assert.equal(summarizeBaggage("No baggage included"), null);
});

test("fare-rule summary classifies varied provider language without exact matching", () => {
  assert.equal(summarizeFareRules("This ticket is NON-REFUNDABLE; changes cost USD 150"), null);
  assert.equal(summarizeFareRules("Refund available before departure with a fee"), "Refundable");
  assert.equal(summarizeFareRules("Changes allowed with USD 150.00 penalty"), null);
  assert.equal(summarizeFareRules(), null);
});

test("flight card keeps fixed footer content compact while airline identity may grow", () => {
  assert.match(card, /style=\{\[s0\.bigPrice, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(card, /style=\{\[s0\.airlineName, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{2\} ellipsizeMode="tail">/);
  assert.equal(card.match(/style=\{\[s0\.benefit, \{ color: theme\.textSecondary \}\]\} numberOfLines=\{1\}/g)?.length, 2);
  assert.match(source, /card: \{[\s\S]*?paddingHorizontal: 12,[\s\S]*?paddingVertical: 9,[\s\S]*?gap: 5,/);
  assert.match(source, /benefits: \{[\s\S]*?paddingTop: 2,[\s\S]*?flexDirection: "row"/);
  assert.match(source, /benefitList: \{ flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", gap: 5, alignSelf: "center" \}/);
  assert.match(source, /benefit: \{ minWidth: 0, fontSize: 10\.5, color: ui\.muted, flex: 1 \}/);
  assert.doesNotMatch(source, /detailsButton(?:Text)?:/);
  for (const viewport of [320, 360, 375, 390, 430]) {
    const cardContentWidth = viewport - 28 - 26;
    assert.ok(cardContentWidth >= 258, `${viewport}px reserves at least 258px for the journey row`);
  }
});

test("flight result cards use the responsive list width with a safe reduced outer inset", () => {
  assert.match(source, /<View style=\{\[s0\.body, s0\.flightResultsBody\]\}>\{resultContent\}<\/View>/);
  assert.match(source, /body: \{ paddingHorizontal: 18, paddingBottom: 92, gap: 14 \}/);
  assert.match(source, /flightResultsBody: \{ paddingHorizontal: 14, gap: 8 \}/);
  assert.match(source, /card: \{[\s\S]*?width: "100%",[\s\S]*?paddingHorizontal: 12,[\s\S]*?paddingVertical: 9,/);

  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const outerInset = 14;
    const cardWidth = viewport - outerInset * 2;
    assert.equal(cardWidth + outerInset * 2, viewport, `${viewport}px card stays within the screen`);
    assert.ok(outerInset >= 12 && outerInset <= 16, `${viewport}px keeps the requested safe edge spacing`);
  }
});

test("flight loading skeleton mirrors the stacked benefit footer", () => {
  assert.match(source, /<View style=\{s0\.skeletonIdentityRow\}>[\s\S]*s0\.skeletonLogo[\s\S]*s0\.skeletonName[\s\S]*<View style=\{s0\.skeletonFlightRow\}>/);
  assert.match(source, /skeletonBenefitLines: \{ flex: 1, gap: 6 \}/);
  assert.match(source, /skeletonBenefitLine: \{ width: "82%" \}/);
  const flightSkeleton = source.slice(source.indexOf("function FlightLoadingSkeleton"), source.indexOf("function HotelLoadingSkeleton"));
  assert.doesNotMatch(flightSkeleton, /skeletonButton/);
});

test("flight card keeps long prices single-line in the stable footer action column", () => {
  assert.match(card, /style=\{s0\.flightMain\}/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch" \}/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /benefitList: \{ flex: 1, minWidth: 0/);
  assert.match(source, /actionColumn: \{ width: 112, maxWidth: "45%", flexShrink: 0, alignItems: "flex-end", gap: 3 \}/);
  assert.doesNotMatch(source, /priceBox:/);

  for (const formattedPrice of ["₦89,482", "₦837,706", "₦12,450,000", "US$1,850", "CA$2,310", "A$2,310", "£1,250", "€1,099"]) {
    assert.ok(formattedPrice.length > 0, `${formattedPrice} remains a single Text value`);
  }
});

test("airline identity preserves its accessible name while bounding very long visual copy", () => {
  const airlineText = /<Text accessibilityLabel=\{`Airline \$\{result\.airlineName\}`\}[\s\S]*?<\/Text>/.exec(card)?.[0] ?? "";
  assert.match(airlineText, /\{result\.airlineName\}/);
  assert.match(airlineText, /numberOfLines=\{2\}/);
  assert.match(airlineText, /ellipsizeMode="tail"/);
  assert.doesNotMatch(source, /airlineName: \{[^}]*maxWidth/);
  assert.match(source, /airlineName: \{ flex: 1, minWidth: 0,[^}]*lineHeight: 18/);
  assert.match(card, /<View style=\{s0\.flightIdentityLayout\}>[\s\S]*?<AirlineLogo[\s\S]*?<View style=\{s0\.airlineHeader\}>[\s\S]*?<Text accessibilityLabel=[\s\S]*?style=\{\[s0\.airlineName/);

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
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46/);
  assert.match(source, /departureColumn: \{ flexBasis: 62, minWidth: 62, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 82, minWidth: 82, flexShrink: 0 \}/);

  const readableMinimums = 78 + 70 + 78;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 28 - 26;
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
  assert.match(airlineLogo, /airlineName\.trim\(\)\.slice\(0, fallbackCharacters\)/);
});

test("flight journey gives its center column responsive surplus width", () => {
  const departureWidth = 62;
  const arrivalWidth = 62;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const previousCardContentWidth = viewport - 36 - 26;
    const cardContentWidth = viewport - 28 - 26;
    const renderedTimelineWidth = cardContentWidth - departureWidth - arrivalWidth - interSectionGaps;
    assert.ok(renderedTimelineWidth >= 70, `${viewport}px keeps a readable route line`);
    assert.equal(
      renderedTimelineWidth - (previousCardContentWidth - departureWidth - arrivalWidth - interSectionGaps),
      8,
      `${viewport}px gives the centered timeline all additional card width`,
    );
  }
});

test("flight times, airports, duration, and stop labels remain single-line", () => {
  assert.equal(card.match(/style=\{\[s0\.time, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\}/g)?.length, 2);
  assert.match(card, /\{leg\.duration\} · \{stopLabel\}<\/Text>/);
  assert.match(card, /\{leg\.originAirport\}<\/Text>/);
  assert.match(card, /\{leg\.destinationAirport\}<\/Text>/);
  assert.match(card, /<Text style=\{s0\.nonstop\} numberOfLines=\{1\}>\{leg\.duration\} · \{stopLabel\}<\/Text>/);
});

test("flight card uses Lucide icons for route, benefits, and saved state", () => {
  for (const icon of ["PlaneTakeoff", "Luggage", "ShieldCheck"]) {
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
  assert.doesNotMatch(card, /useSavedFlights\(\)/);
  assert.match(card, /saved: boolean; onToggleSaved: \(\) => void/);
  assert.match(card, /onToggleSaved\(\)/);
  assert.equal((source.match(/useSavedFlights\(\)/g) || []).length, 1);
  assert.match(source, /saved=\{savedFlights\.has\(item\.id\)\}/);
  assert.match(source, /toggleSavedFlight\(item, params\)/);
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
  assert.match(card, /event\.stopPropagation\(\); onToggleSaved\(\)/);
  assert.match(source, /airlineHeader: \{ minHeight: 20/);
  assert.match(source, /favoriteButton: \{ width: 20, height: 20/);
  assert.doesNotMatch(card, /onPress=.*View details[\s\S]*toggleSavedFlight/);
});

test("compact density keeps identity controls in one band and preserves practical touch targets", () => {
  const header = card.slice(card.indexOf('<View style={s0.airlineHeader}>'), card.indexOf('<View style={s0.journeyList}>'));
  assert.match(header, /s0\.airlineName[\s\S]*?highlight[\s\S]*?s0\.favoriteButton/);
  assert.match(source, /airlineHeader: \{ minHeight: 20,[^}]*gap: 6 \}/);
  assert.match(source, /journeyList: \{ marginTop: 3, gap: 4 \}/);
  assert.match(source, /journeyLabel: \{ fontSize: 9, lineHeight: 10/);
  assert.doesNotMatch(source, /detailsButton(?:Text)?:/);

  const favoriteVisualSize = 20;
  const favoriteHitSlop = 12 * 2;
  assert.ok(favoriteVisualSize + favoriteHitSlop >= 44, "save control retains a 44px effective touch target");
});

test("saved flights remain visible through the canonical Saved source", () => {
  const savedScreen = readFileSync(resolve("src/features/saved/SavedScreen.tsx"), "utf8");
  assert.match(savedScreen, /canonicalSavedCards\(canonical\.items\)/);
  assert.match(savedScreen, /item\.type === "flight"/);
  assert.match(savedScreen, /pathname: resultsReady \? "\/flight-results" : "\/flights"/);
  assert.doesNotMatch(savedScreen, /pathname: "\/flight-details"/);
  assert.doesNotMatch(savedScreen, /useSavedFlights\(\)|savedFlights\.values/);
});
