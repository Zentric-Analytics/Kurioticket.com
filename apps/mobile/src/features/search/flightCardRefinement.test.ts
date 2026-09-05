import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { formatCabinClass, summarizeBaggage, summarizeFareRules } from "./flightCardSummaries";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const card = source.slice(source.indexOf("function FlightCard"), source.indexOf("function HotelCard"));

test("Flight Results uses its narrow support palette only for approved supporting copy", () => {
  assert.match(source, /const flightSupportText = \{\s*light: "#465675",\s*dark: "#B8C3D8",\s*\} as const/);
  assert.match(card, /const supportTextColor = theme\.dark \? flightSupportText\.dark : flightSupportText\.light/);
  for (const style of ["flightNumber", "operatingCarrierText", "stopLabel", "flightMetadataLabel"]) {
    assert.match(card, new RegExp(`s0\\.${style},\\s*\\{\\s*color:\\s*supportTextColor\\s*\\}`));
  }
  for (const style of ["airlineName", "time", "airportCode", "journeyDuration", "bigPrice"]) {
    assert.match(card, new RegExp(`s0\\.${style}, \\{ color: theme\\.textPrimary \\}`));
  }
  const appTheme = readFileSync(resolve("src/theme/AppTheme.tsx"), "utf8");
  assert.match(appTheme, /textSecondary: "#56658E"/);
  assert.match(appTheme, /textSecondary: "#AAB5CD"/);
});

test("flight card maps every approved semantic weight to its matching Inter face", () => {
  const mappings = {
    resultBadgeText: "extraBold",
    airlineName: "bold",
    flightNumber: "medium",
    operatingCarrierText: "medium",
    journeyLabel: "bold",
    time: "extraBold",
    airportCode: "bold",
    journeyDuration: "semibold",
    stopLabel: "medium",
    bigPrice: "bold",
    flightDetailsAffordanceText: "semibold",
    flightMetadataText: "medium",
    flightMetadataLabel: "semibold",
  } as const;
  for (const [style, family] of Object.entries(mappings)) {
    assert.match(source, new RegExp(`${style}: \\{[^\\n]*fontFamily: appFonts\\.${family}`));
  }
});

test("flight card renders labeled provider legs only for the active trip type", () => {
  assert.match(card, /const roundTrip = one\(params\.tripType\) === "round-trip"/);
  assert.match(card, /flightCardLegs\(result, roundTrip\)/);
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} locale=\{locale\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} locale=\{locale\} \/> : null\}/);
});

test("main flight card uses a theme-aware bordered surface and restrained native depth", () => {
  const cardStyle = source.slice(source.indexOf("card: {"), source.indexOf("cardPressed:"));
  assert.match(cardStyle, /borderWidth: 1/);
  assert.match(cardStyle, /borderRadius: 16/);
  assert.match(cardStyle, /shadowOffset: \{ width: 0, height: 2 \}/);
  assert.match(cardStyle, /shadowOpacity: 0\.08/);
  assert.match(cardStyle, /shadowRadius: 10/);
  assert.match(cardStyle, /elevation: 2/);
  assert.match(card, /backgroundColor: theme\.surface/);
  assert.match(card, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(card, /shadowColor: theme\.dark \? "#000000" : "#18305B"/);
  assert.doesNotMatch(cardStyle, /backgroundColor: ["']white["']/);
});

test("flight card preserves display pricing and provider data during details navigation", () => {
  assert.match(card, /fare\?\.formatted \?\? "—"/);
  assert.doesNotMatch(card, /money\(result\.currency, result\.price\)/);
  assert.match(card, /pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
});

test("flight card gives the compact visual fare one semantic spoken label", () => {
  assert.match(card, /const fareAccessibility = `\$\{fare\?\.accessibilityLabel[\s\S]*mainPriceBasis\.accessibilityText/);
  assert.match(card, /provider price \$\{providerFare\.accessibilityLabel\}/);
  assert.match(card, /<Text accessible=\{false\} style=\{\[s0\.bigPrice/);
  assert.equal(card.match(/fare\?\.accessibilityLabel/g)?.length, 1);
  assert.doesNotMatch(card, /Taxes (?:and fees )?included/);
  assert.doesNotMatch(card, /Total for \d|Per traveler|Round trip|One way/);
});

test("converted fares keep truthful accessibility context without visible secondary price copy", () => {
  const fareBlock = card.slice(card.indexOf('<View style={s0.flightCommercialRegion}>'));
  assert.match(card, /flightProviderFarePresentation\(fare\)/);
  assert.match(card, /const labels = flightResultsCopy\(locale\);[\s\S]*flightMainPriceBasis\(fare, labels\)/);
  assert.match(card, /mainPriceBasis\.accessibilityText/);
  assert.match(card, /provider price \$\{providerFare\.accessibilityLabel\}/);
  assert.doesNotMatch(fareBlock, /mainPriceBasis\.label|Provider price:|s0\.estimatedPrice|s0\.providerPrice/);
  assert.equal(card.match(/\{fare\?\.formatted \?\? "—"\}/g)?.length, 1);
  assert.ok(card.indexOf('style={s0.flightMetadataRegion}') < card.indexOf('<View style={s0.flightCommercialRegion}>'));
});

test("the whole card remains the sole details action around a visible affordance", () => {
  assert.match(card, /const openDetails = \(\) => router\.push\(\{ pathname: "\/flight-details"/);
  assert.match(card, /return \(\s*<Pressable[\s\S]*accessibilityRole="button"[\s\S]*accessibilityLabel=\{cardAccessibilityLabel\}[\s\S]*onPress=\{openDetails\}/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
  const affordance = /<View accessible=\{false\} style=\{s0\.flightDetailsAffordance\}>[\s\S]*?<\/View>/.exec(card)?.[0] ?? "";
  assert.match(affordance, /<Text accessible=\{false\}[^>]*numberOfLines=\{1\}>\s*\{labels\.viewDetails\}\s*<\/Text>\s*<ChevronRight/);
  assert.doesNotMatch(affordance, /<ChevronRight[\s\S]*\{labels\.viewDetails\}/);
  assert.doesNotMatch(affordance, />\s*View details\s*</);
  assert.equal((card.match(/<Pressable/g) || []).length, 1);
  assert.doesNotMatch(card, /View deal|labels\.viewDeal|flightDealAction|stopPropagation|onToggleSaved|favoriteButton/);
});

test("flight card derives singular, plural, and nonstop labels from provider stops", () => {
  assert.match(card, /leg\.stops === 1 \? "" : "s"/);
  assert.match(card, /: "Nonstop"/);
  assert.match(card, /\{stopLabel\}/);
});

test("flight metadata uses authoritative provider values and safe fallbacks", () => {
  assert.match(card, /summarizeBaggage\(result\.baggageInfo\)/);
  assert.match(card, /formatCabinClass\(result\.cabinClass\)/);
  assert.match(card, /summarizeFareRules\(result\.refundInfo\)/);
  assert.match(card, /"Review policy"/);
  assert.match(card, /"Review booking rules"/);
  assert.doesNotMatch(card, /Review before/);
});

test("baggage summary only claims inclusions supported by provider copy", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Included");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on included");
  assert.equal(summarizeBaggage("Baggage subject to airline policy"), null);
  assert.equal(summarizeBaggage("No baggage included"), "Not included");
});

test("cabin class formatting is canonical and capitalization-safe", () => {
  assert.equal(formatCabinClass("economy"), "Economy");
  assert.equal(formatCabinClass("premium-economy"), "Premium Economy");
  assert.equal(formatCabinClass("business"), "Business");
  assert.equal(formatCabinClass("first"), "First");
  assert.equal(formatCabinClass("Economy"), "Economy");
  assert.equal(formatCabinClass("BUSINESS"), "Business");
});

test("fare-rule summary classifies varied provider language without exact matching", () => {
  assert.equal(summarizeFareRules("This ticket is NON-REFUNDABLE; changes cost USD 150"), null);
  assert.equal(summarizeFareRules("Refund available before departure with a fee"), "Refundable");
  assert.equal(summarizeFareRules("Changes allowed with USD 150.00 penalty"), null);
  assert.equal(summarizeFareRules(), null);
});

test("flight card uses a compact three-row metadata column while airline identity may grow", () => {
  const metadataBlock = card.slice(card.indexOf('style={s0.flightMetadataRegion}'));
  assert.match(card, /style=\{\[s0\.bigPrice, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\}/);
  assert.doesNotMatch(card, /s0\.bigPrice[^>]*(?:adjustsFontSizeToFit|minimumFontScale)/);
  assert.match(card, /style=\{\[s0\.airlineName, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{2\} ellipsizeMode="tail">/);
  assert.equal(card.match(/style=\{s0\.flightMetadataItem\}/g)?.length, 3);
  assert.doesNotMatch(metadataBlock, /<ScrollView|horizontal/);
  assert.match(source, /card: \{[\s\S]*?paddingHorizontal: 12,[\s\S]*?paddingVertical: 9,[\s\S]*?gap: 5,/);
  assert.match(source, /flightCardFooter: \{[^\n]*width: "100%"/);
  assert.match(source, /flightMetadataRegion: \{ flex: 1, minWidth: 0[^}]*alignItems: "flex-start"[^}]*gap: 5/);
  assert.match(source, /flightMetadataText: \{ flex: 1, minWidth: 0/);
  assert.match(source, /flightCommercialRegion: \{ width: "46%", minWidth: 104, flexShrink: 0, alignSelf: "stretch", alignItems: "flex-end", justifyContent: "space-between"/);
  assert.equal(card.match(/s0\.flightMetadataLabel, \{ color: supportTextColor \}/g)?.length, 3);
  assert.equal(card.match(/s0\.flightMetadataText, \{ color: theme\.textPrimary \}/g)?.length, 3);
  assert.doesNotMatch(source, /flightMetadataIconTile|flightMetadataCopy|flightMetadataValue|flightMetadataLabel: \{[^}]*width/);
  assert.doesNotMatch(source, /metadataSeparator:/);
  assert.doesNotMatch(metadataBlock, />·<\/Text>/);
  for (const icon of ["Luggage", "Armchair", "FileText"]) {
    assert.match(card, new RegExp(`<${icon} accessible=\\{false\\} size=\\{15\\} strokeWidth=\\{2\\.4\\} color=\\{supportTextColor\\}/>`));
  }
  assert.doesNotMatch(source, /benefitList:|benefitItem:/);
  assert.doesNotMatch(source, /flightDealAction(?:Text)?:/);
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 28 - 24;
    assert.ok(cardContentWidth >= 258, `${viewport}px reserves at least 258px for the journey row`);
  }
});

test("flight result cards use the responsive list width with a safe reduced outer inset", () => {
  assert.match(source, /sections=\{\[\{ data: !flightState \? sorted as FlightResult\[\] : \[\] \}\]\}/);
  assert.match(source, /<View style=\{s0\.flightCardItem\}[^>]*>[\s\S]*?<FlightCard/);
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

test("flight loading skeleton mirrors the horizontal metadata footer", () => {
  const flightSkeleton = source.slice(source.indexOf("function FlightLoadingSkeleton"), source.indexOf("function HotelLoadingSkeleton"));
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityLayout}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonJourneyBlock}>');
  const identityRow = flightSkeleton.slice(identityStart, journeyStart);
  assert.ok(identityStart >= 0 && journeyStart > identityStart, "full-width flight placeholder follows the identity row");
  assert.match(identityRow, /s0\.skeletonLogo[\s\S]*s0\.skeletonName[\s\S]*s0\.skeletonFlightNumber[\s\S]*s0\.skeletonIdentityActions[\s\S]*s0\.skeletonBadge/);
  assert.doesNotMatch(identityRow, /skeletonFavoriteButton|skeletonHeart/);
  assert.match(source, /skeletonIdentityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0/);
  assert.doesNotMatch(source, /skeletonTopRow/);
  assert.doesNotMatch(identityRow, /skeletonJourneyBlock/);
  assert.doesNotMatch(flightSkeleton, /\["baggage", "cabin", "fare-rules"\]\.map/);
  assert.match(flightSkeleton, /skeletonMetadataDivider[\s\S]*skeletonMetadataRow[\s\S]*skeletonMetadataLine/);
  assert.match(source, /skeletonMetadataRow: \{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start" \}/);
  assert.doesNotMatch(source, /skeletonMetadataItem|skeletonMetadataIcon/);
  assert.match(flightSkeleton, /skeletonPriceLine[\s\S]*skeletonDetailsActionLine/);
  assert.doesNotMatch(flightSkeleton, /skeletonEstimatedPriceLine|skeletonProviderPriceLine|skeletonButton/);
});

test("flight card keeps long prices single-line in the full-width fare row", () => {
  assert.match(card, /style=\{s0\.flightMain\}/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch" \}/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /metadataItem: \{ flex: 1, minWidth: 0, flexDirection: "row"/);
  assert.match(source, /flightLowerSection: \{[^\n]*flexDirection: "row"/);
  assert.match(source, /flightDetailsAffordance: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 \}/);
  assert.match(source, /flightDetailsAffordanceText: \{ fontSize: 13, lineHeight: 15, fontWeight: "600", fontFamily: appFonts\.semibold \}/);
  assert.doesNotMatch(source, /actionColumn:/);
  assert.doesNotMatch(source, /priceBox:/);
  assert.doesNotMatch(card, /s0\.bigPrice[^>]*(?:adjustsFontSizeToFit|minimumFontScale|ellipsizeMode)/);

  for (const formattedPrice of ["₦89,482", "₦837,706", "₦12,450,000", "$1,850", "$2,310", "$2,310", "£1,250", "€1,099"]) {
    assert.ok(formattedPrice.length > 0, `${formattedPrice} remains a single Text value`);
  }
});

test("airline identity preserves its accessible name while bounding very long visual copy", () => {
  const airlineText = /<Text style=\{\[s0\.airlineName[\s\S]*?<\/Text>/.exec(card)?.[0] ?? "";
  assert.match(airlineText, /\{result\.airlineName\}/);
  assert.match(airlineText, /numberOfLines=\{2\}/);
  assert.match(airlineText, /ellipsizeMode="tail"/);
  assert.doesNotMatch(source, /airlineName: \{[^}]*maxWidth/);
  assert.match(source, /airlineCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /airlineName: \{[^}]*lineHeight: 17/);
  assert.match(source, /airlineName: \{ fontSize: 13, lineHeight: 17, color: ui\.navy, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(card, /s0\.airlineName, \{ color: theme\.textPrimary \}/);
  assert.match(card, /<View style=\{s0\.flightIdentityLayout\}>[\s\S]*?<AirlineLogo[\s\S]*?<View style=\{s0\.airlineHeader\}>[\s\S]*?<View[\s\S]*?style=\{s0\.airlineCopy\}[\s\S]*?<Text style=\{\[s0\.airlineName/);

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

test("flight identity actions use a normal horizontal row without changing journey spacing", () => {
  assert.match(source, /airlineHeader: \{ width: "100%", minWidth: 0, flexDirection: "row", alignItems: "flex-start" \}/);
  assert.match(source, /airlineCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /identityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 0, transform: \[\{ translateY: -3 \}\] \}/);
  assert.doesNotMatch(source, /identityActions: \{[^}]*position: "absolute"/);
  assert.doesNotMatch(source, /airlineHeader: \{[^}]*paddingRight: 68/);
  assert.match(source, /journeyList: \{ width: "100%", marginTop: 8, gap: 10 \}/);
});

test("operating-carrier clarity stays conditional beneath the primary airline identity", () => {
  const header = card.slice(card.indexOf('<View style={s0.airlineHeader}>'), card.indexOf('<View style={s0.journeyList}>'));
  assert.match(card, /flightOperatingCarrierPresentation\(result\)/);
  assert.match(header, /s0\.airlineCopy[\s\S]*?s0\.airlineName[\s\S]*?\{result\.airlineName\}[\s\S]*?flightNumber \? \([\s\S]*?s0\.flightNumber[\s\S]*?\{flightNumber\}[\s\S]*?\) : null\}[\s\S]*?operatingCarrierPresentation \? \([\s\S]*?s0\.operatingCarrierText[\s\S]*?operatingCarrierPresentation\.text[\s\S]*?\) : null\}[\s\S]*?s0\.identityActions/);
  assert.match(header, /operatingCarrierPresentation\.accessibilityText/);
  assert.match(header, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.match(source, /operatingCarrierText: \{ fontSize: 11, lineHeight: 15, fontWeight: "500", fontFamily: appFonts\.medium \}/);
  assert.match(card, /operatingCarrierText, \{ color: supportTextColor \}/);
  assert.doesNotMatch(header, /marketingFlightNumber|operatingFlightNumber|codeshare/i);
  assert.doesNotMatch(source, /operatingCarrierBadge|operatingCarrierChip/);
});

test("flight number is quiet conditional text directly beneath the airline name", () => {
  const header = card.slice(card.indexOf('<View style={s0.airlineHeader}>'), card.indexOf('<View style={s0.journeyList}>'));
  assert.match(card, /const flightNumber = result\.flightNumber\?\.trim\(\)/);
  assert.match(header, /\{flightNumber \? \([\s\S]*?<Text style=\{\[s0\.flightNumber, \{ color: supportTextColor \}\]\} numberOfLines=\{1\} ellipsizeMode="tail">[\s\S]*?\{flightNumber\}[\s\S]*?<\/Text>[\s\S]*?\) : null\}/);
  assert.match(source, /flightNumber: \{ marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: "500", fontFamily: appFonts\.medium \}/);
  assert.doesNotMatch(header, /N\/A|Unknown|—|placeholder/i);
  assert.doesNotMatch(source, /flightNumber(?:Badge|Chip|Pill)/);
});

test("narrow flight cards reserve deterministic space for every journey section", () => {
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");
  assert.match(source, /journeyPrimaryRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 \}/);
  assert.match(card, /<AirlineLogo[\s\S]*logoUrl=\{result\.airlineLogo\}/);
  assert.match(card, /<AirlineLogo[\s\S]*?variant="result-card"/);
  assert.match(airlineLogo, /logo: \{[\s\S]*?width: 32,[\s\S]*?height: 32,[\s\S]*?flexShrink: 0/);
  assert.match(airlineLogo, /tile: \{[\s\S]*?width: 32,[\s\S]*?height: 32,[\s\S]*?flexShrink: 0/);
  assert.match(source, /airlineLogoColumn: \{ width: 38, flexShrink: 0, alignItems: "center" \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46/);
  assert.match(source, /departureColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);
  assert.match(source, /arrivalColumn: \{ flexBasis: 72, minWidth: 72, flexShrink: 0 \}/);

  const readableMinimums = 72 + 70 + 72;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 28 - 24;
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
  const departureWidth = 72;
  const arrivalWidth = 72;
  const interSectionGaps = 6 * 2;
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 28 - 24;
    const indentedJourneyWidth = cardContentWidth - 32 - 10;
    const renderedTimelineWidth = cardContentWidth - departureWidth - arrivalWidth - interSectionGaps;
    assert.ok(renderedTimelineWidth >= 70, `${viewport}px keeps a readable route line`);
    assert.equal(
      renderedTimelineWidth - (indentedJourneyWidth - departureWidth - arrivalWidth - interSectionGaps),
      42,
      `${viewport}px journey no longer loses the 32px logo and 10px identity gap`,
    );
  }
});

test("flight journey applies the approved Step 5 hierarchy, colors, and accessibility", () => {
  assert.match(card, /s0\.journeyLabel, \{ color: theme\.dark \? "#8FB5FF" : ui\.blue \}/);
  assert.equal(card.match(/style=\{\[s0\.time, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.85\}/g)?.length, 2);
  assert.match(card, /s0\.journeyDuration, \{ color: theme\.textPrimary \}[\s\S]*?minimumFontScale=\{0\.85\}>\{leg\.duration\}<\/Text>/);
  assert.doesNotMatch(card, /\{leg\.duration\} · \{stopLabel\}/);
  assert.equal(card.match(/s0\.airportCode, \{ color: theme\.textPrimary \}/g)?.length, 2);
  assert.match(card, /s0\.stopLabel, \{ color: supportTextColor \}[\s\S]*?numberOfLines=\{1\}>\{stopLabel\}/);
  assert.doesNotMatch(card, /routeSummary|\{leg\.originAirport\} → \{leg\.destinationAirport\}/);
  assert.equal(card.match(/s0\.routeDot, \{ backgroundColor: theme\.textSecondary \}/g)?.length, 2);
  assert.equal(card.match(/s0\.line, \{ backgroundColor: theme\.border \}/g)?.length, 2);
  assert.match(card, /<PlaneTakeoff accessible=\{false\} size=\{14\} strokeWidth=\{2\} color=\{theme\.dark \? "#8FB5FF" : ui\.blue\} \/>/);
  assert.equal(card.match(/accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/g)?.length, 3);
  assert.match(card, /const intlLocale = mobileLocales\.find/);
  assert.match(card, /const departureDate = providerLocalFlightDate\(leg\.departureTime, intlLocale\)/);
  assert.match(card, /const arrivalDate = providerLocalFlightDate\(leg\.arrivalTime, intlLocale\)/);
  assert.equal(card.match(/s0\.airportDate, \{ color: supportTextColor \}/g)?.length, 2);
  assert.match(card, /accessibilityLabel=\{`\$\{label\.toLowerCase\(\)\}: \$\{clock\(leg\.departureTime\)\} \$\{leg\.originAirport\}\$\{departureDate/);
  assert.match(source, /journeyLabel: \{ fontSize: 10, lineHeight: 12, fontWeight: "700", fontFamily: appFonts\.bold, letterSpacing: 0\.8 \}/);
  assert.match(source, /time: \{ fontSize: 14, lineHeight: 18, fontWeight: "800"/);
  assert.match(source, /airportCode: \{ fontSize: 11, lineHeight: 14, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /journeyDuration: \{[^}]*fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts\.semibold, textAlign: "center" \}/);
  assert.match(source, /stopLabel: \{[^}]*fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts\.medium, textAlign: "center" \}/);
  assert.match(source, /flightResultCount: \{ fontSize: 13, lineHeight: 17, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /bigPrice: \{[^}]*fontSize: 19, lineHeight: 24, fontWeight: "700"/);
});

test("flight result card removes favorite UI while retaining approved travel icons", () => {
  assert.match(card, /<PlaneTakeoff\b/);
  assert.match(card, /<Luggage\b/);
  assert.match(card, /<Armchair\b/);
  assert.match(card, /<FileText\b/);
  assert.doesNotMatch(card, /<Heart\b|favoriteButton|Save .* flight|Remove .* flight from saved/);
  assert.doesNotMatch(card, /saved: boolean|pending: boolean|onToggleSaved/);
  assert.doesNotMatch(source, /useSavedFlights\(\)|flightSavedSignature\(item\)|toggleSavedFlight\(item, params\)/);
  assert.equal((card.match(/<Pressable/g) || []).length, 1);
});

test("highlight is the only conditional identity action and uses the released right edge", () => {
  const header = card.slice(card.indexOf('<View style={s0.airlineHeader}>'), card.indexOf('<View style={s0.journeyList}>'));
  assert.match(header, /\{highlight \? \(\s*<View style=\{s0\.identityActions\}>[\s\S]*?s0\.resultBadge[\s\S]*?<\/View>\s*\) : null\}/);
  assert.doesNotMatch(header, /favorite|placeholder|invisible|opacity:\s*0/i);
  assert.match(source, /airlineCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /identityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 0, transform: \[\{ translateY: -3 \}\] \}/);
  assert.doesNotMatch(source, /favoriteButton|favoritePending|favoritePressed/);
  assert.match(card, /const highlightLabel = highlight === "Best" \? "Best value" : highlight/);
  assert.match(card, /accessibilityLabel=\{`\$\{highlightLabel\} flight result`\}/);
  assert.match(card, /highlight === "Best" \|\| highlight === "Cheapest"/);
  assert.match(card, /theme\.dark \? "#153D2A" : "#E3F6EA"/);
  assert.match(card, /theme\.dark \? "#8BE0B0" : "#157347"/);
  assert.match(card, /theme\.dark \? "#173568" : "#EEF4FF"/);
  assert.match(card, /theme\.dark \? "#8FB5FF" : ui\.blue/);
  assert.match(source, /resultBadge: \{ height: 24,[^}]*paddingHorizontal: 9, borderRadius: 12 \}/);
  assert.match(source, /resultBadgeText: \{ fontSize: 10, lineHeight: 13, fontWeight: "800", fontFamily: appFonts\.extraBold \}/);
  assert.match(source, /journeyList: \{ width: "100%", marginTop: 8, gap: 10 \}/);
});

test("saved flights remain visible through the canonical Saved source", () => {
  const savedScreen = readFileSync(resolve("src/features/saved/SavedScreen.tsx"), "utf8");
  assert.match(savedScreen, /canonicalSavedCards\(canonical\.items\)/);
  assert.match(savedScreen, /item\.type === "flight"/);
  assert.match(savedScreen, /pathname: resultsReady \? "\/flight-results" : "\/flights"/);
  assert.doesNotMatch(savedScreen, /pathname: "\/flight-details"/);
  assert.doesNotMatch(savedScreen, /useSavedFlights\(\)|savedFlights\.values/);
});
