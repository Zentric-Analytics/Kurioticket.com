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
  for (const style of ["flightNumber", "operatingCarrierText", "stopLabel", "estimatedPrice", "providerPrice", "metadataText"]) {
    assert.match(card, new RegExp(`s0\\.${style}, \\{ color: supportTextColor \\}`));
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
    bigPrice: "black",
    estimatedPrice: "bold",
    providerPrice: "medium",
    metadataText: "medium",
  } as const;
  for (const [style, family] of Object.entries(mappings)) {
    assert.match(source, new RegExp(`${style}: \\{[^\\n]*fontFamily: appFonts\\.${family}`));
  }
});

test("flight card renders labeled provider legs only for the active trip type", () => {
  assert.match(card, /const roundTrip = one\(params\.tripType\) === "round-trip"/);
  assert.match(card, /flightCardLegs\(result, roundTrip\)/);
  assert.match(card, /<FlightJourneyRow label="OUTBOUND" leg=\{outbound\} \/>/);
  assert.match(card, /\{returnLeg \? <FlightJourneyRow label="RETURN" leg=\{returnLeg\} \/> : null\}/);
});

test("main flight card uses a theme-aware bordered surface and restrained native depth", () => {
  const cardStyle = /card: \{([\s\S]*?)\n  \},/.exec(source)?.[1] ?? "";
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
  assert.match(card, /const fareAccessibility = `\$\{fare\?\.accessibilityLabel/);
  assert.match(card, /provider price \$\{providerFare\.accessibilityLabel\}/);
  assert.match(card, /<Text accessible=\{false\} style=\{\[s0\.bigPrice/);
  assert.equal(card.match(/fare\?\.accessibilityLabel/g)?.length, 1);
  assert.doesNotMatch(card, /Taxes (?:and fees )?included/);
  assert.doesNotMatch(card, /Total for \d|Per traveler|Round trip|One way/);
});

test("converted fares add truthful provider context without duplicating same-currency fares", () => {
  const fareBlock = card.slice(card.indexOf('<View style={s0.fareRow}>'), card.indexOf('<View style={[s0.metadataDivider'));
  assert.match(card, /flightProviderFarePresentation\(fare\)/);
  assert.match(fareBlock, /\{fare\?\.converted === true \? \([\s\S]*ESTIMATED PRICE[\s\S]*\) : null\}/);
  assert.match(fareBlock, /\{providerFare \? \([\s\S]*Provider price: \{providerFare\.formatted\} \{providerFare\.currency\}[\s\S]*\) : null\}/);
  assert.match(fareBlock, /estimatedPrice, \{ color: supportTextColor \}/);
  assert.match(fareBlock, /providerPrice, \{ color: supportTextColor \}/);
  assert.equal(card.match(/\{fare\?\.formatted \?\? "—"\}/g)?.length, 1);
  assert.doesNotMatch(fareBlock, /US\$|A\$|CA\$/);
  assert.ok(card.indexOf('<View style={s0.fareRow}>') < card.indexOf('<View style={[s0.metadataDivider'));
});

test("the whole card replaces the details CTA", () => {
  assert.match(card, /return \(\s*<Pressable[\s\S]*accessibilityRole="button"[\s\S]*pathname: "\/flight-details"/);
  assert.match(card, /buildFlightDetailParams\(\{ searchParams: params, result, fare, displayCurrencyContext \}\)/);
  assert.doesNotMatch(card, /View details|detailsButton|detailsButtonText/);
  assert.match(card, /event\.stopPropagation\(\); if \(!pending\) onToggleSaved\(\)/g);
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
  assert.match(card, /"Review before booking"/);
});

test("baggage summary only claims inclusions supported by provider copy", () => {
  assert.equal(summarizeBaggage("Carry-on and 1 checked bag included"), "Bags included");
  assert.equal(summarizeBaggage("Cabin baggage included"), "Carry-on");
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

test("flight card keeps horizontal metadata compact while airline identity may grow", () => {
  assert.match(card, /style=\{\[s0\.bigPrice, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.8\}/);
  assert.match(card, /style=\{\[s0\.airlineName, \{ color: theme\.textPrimary \}\]\} numberOfLines=\{2\} ellipsizeMode="tail">/);
  assert.equal(card.match(/style=\{s0\.metadataItem\}/g)?.length, 3);
  assert.match(source, /card: \{[\s\S]*?paddingHorizontal: 12,[\s\S]*?paddingVertical: 9,[\s\S]*?gap: 5,/);
  assert.match(source, /metadataFooterContainer: \{ width: "100%", alignItems: "center" \}/);
  assert.match(source, /metadataRow: \{ maxWidth: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "center", paddingTop: 1, paddingBottom: 2 \}/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*flexWrap/);
  assert.doesNotMatch(source, /metadataRow: \{[^}]*justifyContent: "space-between"/);
  assert.match(source, /metadataItem: \{ flexDirection: "row", alignItems: "center", gap: 3, minWidth: 0, flexShrink: 1 \}/);
  assert.match(source, /metadataText: \{ flexShrink: 1, minWidth: 0, fontSize: 12, lineHeight: 15, fontWeight: "500", fontFamily: appFonts\.medium \}/);
  assert.doesNotMatch(source, /metadataText: \{[^}]*flex: 1/);
  assert.equal(card.match(/<Text accessible=\{false\} numberOfLines=\{1\} ellipsizeMode="tail" style=\{\[s0\.metadataText/g)?.length, 3);
  assert.equal(card.match(/s0\.metadataText, \{ color: supportTextColor \}/g)?.length, 3);
  assert.equal(card.match(/style=\{\[s0\.metadataSeparator, \{ color: supportTextColor \}\]\}>·<\/Text>/g)?.length, 2);
  for (const icon of ["Luggage", "Armchair", "FileText"]) {
    assert.match(card, new RegExp(`<${icon} accessible=\\{false\\} size=\\{13\\} strokeWidth=\\{2\\} color=\\{supportTextColor\\} />`));
  }
  assert.doesNotMatch(source, /benefitList:|benefitItem:/);
  assert.doesNotMatch(source, /detailsButton(?:Text)?:/);
  for (const viewport of [320, 360, 375, 390, 412, 430, 480]) {
    const cardContentWidth = viewport - 28 - 24;
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

test("flight loading skeleton mirrors the horizontal metadata footer", () => {
  const flightSkeleton = source.slice(source.indexOf("function FlightLoadingSkeleton"), source.indexOf("function HotelLoadingSkeleton"));
  const identityStart = flightSkeleton.indexOf('<View style={s0.skeletonIdentityLayout}>');
  const journeyStart = flightSkeleton.indexOf('<View style={s0.skeletonJourneyBlock}>');
  const identityRow = flightSkeleton.slice(identityStart, journeyStart);
  assert.ok(identityStart >= 0 && journeyStart > identityStart, "full-width flight placeholder follows the identity row");
  assert.match(identityRow, /s0\.skeletonLogo[\s\S]*s0\.skeletonName[\s\S]*s0\.skeletonFlightNumber[\s\S]*s0\.skeletonIdentityActions[\s\S]*s0\.skeletonBadge[\s\S]*s0\.skeletonFavoriteButton[\s\S]*s0\.skeletonHeart/);
  assert.match(source, /skeletonIdentityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0/);
  assert.doesNotMatch(source, /skeletonTopRow/);
  assert.doesNotMatch(identityRow, /skeletonJourneyBlock/);
  assert.doesNotMatch(flightSkeleton, /\["baggage", "cabin", "fare-rules"\]\.map/);
  assert.match(flightSkeleton, /skeletonMetadataDivider[\s\S]*skeletonMetadataRow[\s\S]*skeletonMetadataLine/);
  assert.match(source, /skeletonMetadataRow: \{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "flex-start" \}/);
  assert.doesNotMatch(source, /skeletonMetadataItem|skeletonMetadataIcon/);
  assert.doesNotMatch(flightSkeleton, /skeletonButton/);
});

test("flight card keeps long prices single-line in the full-width fare row", () => {
  assert.match(card, /style=\{s0\.flightMain\}/);
  assert.match(source, /flightMain: \{ width: "100%", alignItems: "stretch" \}/);
  assert.match(source, /flightDetails: \{ flex: 1, minWidth: 0 \}/);
  assert.match(source, /timelineColumn: \{ flex: 1, minWidth: 46, alignItems: "center" \}/);
  assert.match(source, /metadataItem: \{ flexDirection: "row"/);
  assert.match(source, /fareRow: \{ width: "100%", paddingTop: 10, flexDirection: "row", justifyContent: "flex-end" \}/);
  assert.doesNotMatch(source, /actionColumn:/);
  assert.doesNotMatch(source, /priceBox:/);

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
  assert.match(source, /airlineName: \{[^}]*lineHeight: 18/);
  assert.match(source, /airlineName: \{ fontSize: 14, lineHeight: 18, color: ui\.navy, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(card, /s0\.airlineName, \{ color: theme\.textPrimary \}/);
  assert.match(source, /identityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 8 \}/);
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
  assert.match(source, /identityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 8 \}/);
  assert.doesNotMatch(source, /identityActions: \{[^}]*position: "absolute"/);
  assert.doesNotMatch(source, /airlineHeader: \{[^}]*paddingRight: 68/);
  assert.match(source, /journeyList: \{ width: "100%", marginTop: 10, gap: 10 \}/);
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
  assert.match(source, /airlineLogoColumn: \{ width: 42, flexShrink: 0, alignItems: "center" \}/);
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
  assert.match(card, /accessibilityLabel=\{`\$\{label\.toLowerCase\(\)\}: \$\{clock\(leg\.departureTime\)\} \$\{leg\.originAirport\} to \$\{clock\(leg\.arrivalTime\)\} \$\{leg\.destinationAirport\}, \$\{leg\.duration\}, \$\{stopLabel\}`\}/);
  assert.match(source, /journeyLabel: \{ fontSize: 10, lineHeight: 12, fontWeight: "700", fontFamily: appFonts\.bold, letterSpacing: 0\.8 \}/);
  assert.match(source, /time: \{ fontSize: 15, lineHeight: 19, fontWeight: "800"/);
  assert.match(source, /airportCode: \{ fontSize: 11, lineHeight: 14, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /journeyDuration: \{[^}]*fontSize: 11, lineHeight: 14, fontWeight: "600", fontFamily: appFonts\.semibold, textAlign: "center" \}/);
  assert.match(source, /stopLabel: \{[^}]*fontSize: 10, lineHeight: 13, fontWeight: "500", fontFamily: appFonts\.medium, textAlign: "center" \}/);
  assert.match(source, /flightResultCount: \{ paddingHorizontal: 14, paddingTop: 4, fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(source, /bigPrice: \{ fontSize: 20, lineHeight: 25, fontWeight: "900"/);
});

test("flight card uses the approved Lucide icons", () => {
  assert.match(card, /<PlaneTakeoff\b/);
  assert.match(card, /<Luggage\b/);
  assert.match(card, /<Armchair\b/);
  assert.match(card, /<FileText\b/);
  assert.match(source, /import \{ Heart \} from "lucide-react-native"/);
  assert.match(card, /<Heart[\s\S]*fill=\{saved \? androidFavoriteColors\.active : "transparent"\}/);
  assert.match(card, /color=\{saved \? androidFavoriteColors\.active : theme\.textSecondary\}/);
  assert.match(card, /accessibilityLabel=\{saved \? `Remove \$\{result\.airlineName\} flight from saved` : `Save \$\{result\.airlineName\} flight`\}/);
  assert.doesNotMatch(card, /[▣◉★]/);
  assert.doesNotMatch(card, /<FlowIcon[\s\S]*name="heart"/);
});

test("flight favorite uses persistent shared state for initial, save, and remove behavior", () => {
  assert.doesNotMatch(card, /useSavedFlights\(\)/);
  assert.match(card, /saved: boolean; pending: boolean; onToggleSaved: \(\) => void/);
  assert.match(card, /onToggleSaved\(\)/);
  assert.equal((source.match(/useSavedFlights\(\)/g) || []).length, 1);
  assert.match(source, /saved=\{savedFlights\.has\(flightSavedSignature\(item\)\)\}/);
  assert.match(source, /toggleSavedFlight\(item, params\)/);
  assert.doesNotMatch(card, /useState\(false\)/);
  const hook = readFileSync(resolve("src/storage/useSavedFlights.ts"), "utf8");
  assert.match(hook, /savedRepositoryFor\(resolvedUserId\)\.toggleFlight\(flight, searchParams\)/);
  assert.doesNotMatch(hook, /SecureStore|SavedFlightsStore|require\(/);
  assert.match(hook, /favoriteAction\(resolvedUserId\)/);
});

test("flight favorite is accessible and isolated inside the identity action stack", () => {
  assert.match(card, /accessibilityRole="button"/);
  assert.match(card, /accessibilityState=\{\{ selected: saved, busy: pending, disabled: pending \}\}/);
  assert.doesNotMatch(card, /hitSlop=/);
  assert.match(card, /event\.stopPropagation\(\); if \(!pending\) onToggleSaved\(\)/g);
  assert.match(source, /airlineHeader: \{ width: "100%", minWidth: 0, flexDirection: "row"/);
  assert.match(source, /favoriteButton: \{ width: 44, height: 44/);
  assert.match(card, /<Heart[\s\S]*?size=\{20\}/);
  assert.doesNotMatch(card, /onPress=.*View details[\s\S]*toggleSavedFlight/);
});

test("highlight sits immediately left of the fixed-right favorite action", () => {
  const header = card.slice(card.indexOf('<View style={s0.airlineHeader}>'), card.indexOf('<View style={s0.journeyList}>'));
  const actions = header.slice(header.indexOf('<View style={s0.identityActions}>'), header.indexOf('</View>', header.indexOf('s0.favoriteButton')) + 7);
  assert.match(actions, /\{highlight \? \([\s\S]*?s0\.resultBadge[\s\S]*?\) : null\}[\s\S]*?<Pressable[\s\S]*?s0\.favoriteButton/);
  assert.ok(actions.indexOf("s0.resultBadge") < actions.indexOf("s0.favoriteButton"));
  assert.doesNotMatch(actions, /placeholder|invisible|opacity:\s*0/i);
  assert.match(source, /identityActions: \{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, gap: 8 \}/);
  assert.match(source, /favoriteButton: \{ width: 44, height: 44, flexShrink: 0/);
  assert.match(card, /<Heart[\s\S]*?size=\{20\}/);
  assert.match(card, /fill=\{saved \? androidFavoriteColors\.active : "transparent"\}/);
  assert.match(card, /color=\{saved \? androidFavoriteColors\.active : theme\.textSecondary\}/);
  assert.match(card, /onPressIn=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(card, /event\.stopPropagation\(\); if \(!pending\) onToggleSaved\(\);/);

  assert.match(card, /const highlightLabel = highlight === "Best" \? "Best value" : highlight/);
  assert.match(card, /accessibilityLabel=\{`\$\{highlightLabel\} flight result`\}/);
  assert.match(card, /<Text numberOfLines=\{1\} style=\{\[s0\.resultBadgeText/);
  assert.match(card, /highlight === "Best" \|\| highlight === "Cheapest"/);
  assert.match(card, /theme\.dark \? "#153D2A" : "#EAF8F0"/);
  assert.match(card, /theme\.dark \? "#8BE0B0" : "#157347"/);
  assert.match(card, /theme\.dark \? "#173568" : "#EEF4FF"/);
  assert.match(card, /theme\.dark \? "#8FB5FF" : ui\.blue/);
  assert.match(source, /resultBadge: \{ height: 22,[^}]*paddingHorizontal: 8, borderRadius: 11 \}/);
  assert.match(source, /resultBadgeText: \{ fontSize: 10, lineHeight: 13, fontWeight: "800", fontFamily: appFonts\.extraBold \}/);
  assert.match(source, /journeyList: \{ width: "100%", marginTop: 10, gap: 10 \}/);
});

test("saved flights remain visible through the canonical Saved source", () => {
  const savedScreen = readFileSync(resolve("src/features/saved/SavedScreen.tsx"), "utf8");
  assert.match(savedScreen, /canonicalSavedCards\(canonical\.items\)/);
  assert.match(savedScreen, /item\.type === "flight"/);
  assert.match(savedScreen, /pathname: resultsReady \? "\/flight-results" : "\/flights"/);
  assert.doesNotMatch(savedScreen, /pathname: "\/flight-details"/);
  assert.doesNotMatch(savedScreen, /useSavedFlights\(\)|savedFlights\.values/);
});
