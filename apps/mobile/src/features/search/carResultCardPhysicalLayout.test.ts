import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const providerPresentation = readFileSync(resolve("src/features/search/nativeCarProviderPresentation.ts"), "utf8");
const priceAlertSource = readFileSync(resolve("src/features/search/NativeCarPriceAlert.tsx"), "utf8");
const flightResultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));
const style = (name: string) => styles.slice(styles.indexOf(`${name}:`), styles.indexOf("},", styles.indexOf(`${name}:`)) + 2);
const topStart = source.indexOf('<View style={c.topSection}>');
const lowerStart = source.indexOf('<View style={[c.lowerBand,{backgroundColor:carInformationSurface,borderTopColor:carDividerColor}]}>');
const top = source.slice(topStart, lowerStart);
const lower = source.slice(lowerStart, source.indexOf("  </View>;"));

test("Car card shell and two-level grid retain safe natural layout", () => {
  assert.match(source, /c\.card,\{backgroundColor:carInformationSurface,borderColor:theme\.dark\?theme\.border:"#D8E1EC",shadowColor:theme\.dark\?"#000000":"#18305B"\}/);
  assert.match(style("card"), /borderWidth:1,borderRadius:13,overflow:"hidden"/);
  assert.match(style("topSection"), /minHeight:156,flexDirection:"row",alignItems:"stretch"/);
  assert.match(style("visualColumn"), /width:"40%",minHeight:156,padding:6/);
  assert.match(style("lowerBand"), /flexDirection:"row",alignItems:"stretch",borderTopWidth:1/);
  assert.doesNotMatch(style("card").replace(/shadowOffset:\{[^}]*\}/, ""), /(?:^|,)height:/);
  for (const name of ["topSection", "visualColumn", "identityZone", "lowerBand", "specColumn", "commerceColumn"])
    assert.doesNotMatch(style(name), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translateY|(?:^|,)height:/);
});

test("vehicle image presentation and canvas ownership remain intact", () => {
  assert.match(source, /\[c\.visualColumn,\{backgroundColor:theme\.surface\}\]/);
  assert.equal(source.match(/backgroundColor:theme\.surface/g)?.length, 1);
  assert.match(source, /const imageResizeMode = curatedImage \? "contain" : "cover"/);
  assert.match(source, /image:\{\.\.\.StyleSheet\.absoluteFillObject\}/);
  assert.match(style("curatedImage"), /transform:\[\{scale:1\.08\}\]/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, /accessibilityLabel=\{`\$\{result\.modelName\} vehicle image unavailable`\}/);
  assert.match(source, />Vehicle image unavailable<\/Text>/);
});

test("non-image information uses a balanced light gray while the image stays separate", () => {
  assert.match(source, /const carInformationSurface = theme\.dark \? resultBackgroundColor : "#E7EBF1"/);
  assert.match(priceAlertSource, /trackColor=\{\{ false: theme\.dark \? "#465269" : "#CBD5E1", true: theme\.switchTrackActive \}\}/);
  assert.doesNotMatch(source, /const carInformationSurface = theme\.dark \? resultBackgroundColor : "#(?:DEE4EC|CBD5E1)"/);
  assert.match(source, /\[c\.identityZone,\{backgroundColor:carInformationSurface\}\]/);
  assert.match(source, /\[c\.lowerBand,\{backgroundColor:carInformationSurface,borderTopColor:carDividerColor\}\]/);
  assert.doesNotMatch(source, /c\.visualColumn,\{backgroundColor:carInformationSurface\}/);
  assert.match(source, /c\.visualColumn,\{backgroundColor:theme\.surface\}/);
  assert.doesNotMatch(source, /c\.visualColumn,\{backgroundColor:"#(?:E7EBF1|DEE4EC|CBD5E1)"\}/);
});

test("top section owns only the visual and identity information", () => {
  assert.ok(topStart >= 0 && lowerStart > topStart);
  assert.match(top, /c\.visualColumn[\s\S]*<View style=\{\[c\.identityZone,\{backgroundColor:carInformationSurface\}\]\}>/);
  for (const token of ["identity.primaryName", "identity.secondaryModel", "or similar", "result.categoryLabel", "result.pickupLocation", "savedState.toggle", "Share2", "Free cancellation"])
    assert.ok(top.includes(token), `missing ${token} from top section`);
  assert.doesNotMatch(top, /result\.passengers|result\.doors|result\.transmission|result\.bags|offer\.totalPrice|offer\.pricePerDay|>View deal<\/Text>/);
  assert.doesNotMatch(source, /topMetaShell|topMetaRow|topMetaContent|hasTopMeta/);
});

test("Best value precedes the header for normal inventory while sandbox cards stay clearly simulated", () => {
  const bestValueStart = source.indexOf("rank === 0 && !sandbox");
  const headerStart = source.indexOf('<View style={c.headerRow}>', bestValueStart);
  const detailsStart = source.indexOf('<View style={c.identityDetails}>', headerStart);
  const locationStart = source.indexOf('<View style={c.location}>', detailsStart);
  const freeCancellationStart = source.indexOf("offer?.freeCancellation", locationStart);
  assert.ok(bestValueStart >= 0 && bestValueStart < headerStart);
  assert.ok(headerStart < detailsStart && detailsStart < locationStart && locationStart < freeCancellationStart);
  assert.match(source, /rank === 0 && !sandbox \? <View style=\{c\.bestValueRow\}><View style=\{c\.badge\}><Award size=\{11\} color="#15803D" \/><Text style=\{c\.badgeText\}>Best value/);
  assert.match(source, /sandbox \? <Text style=\{\[c\.sandboxStatus,\{color:theme\.textSecondary\}\]\}>KAYAK sandbox · Simulated · Not bookable<\/Text> : null/);
  assert.match(source, /!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(top, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>[\s\S]*ShieldCheck[\s\S]*Free cancellation/);
  assert.match(source, /const freeCancellationColor = theme\.dark \? theme\.textPrimary : "#000000"/);
  assert.doesNotMatch(style("freeCancellation") + style("freeCancellationText"), /#15803D|#ECFDF5|backgroundColor|border/);
  assert.match(style("badge"), /backgroundColor:"#ECFDF5"/);
  assert.match(style("badgeText"), /color:"#15803D"/);
  assert.match(style("bestValueRow"), /alignItems:"flex-end"/);
  assert.equal(source.match(/>Free cancellation<\/Text>/g)?.length, 1);
  assert.equal(source.match(/>Best value<\/Text>/g)?.length, 1);
  assert.doesNotMatch(source, /benefits/);
  for (const name of ["bestValueRow", "badge"])
    assert.doesNotMatch(style(name), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translate/);
});

test("name and save/share controls remain siblings for normal inventory", () => {
  const header = top.slice(top.indexOf('<View style={c.headerRow}>'), top.indexOf('<View style={c.identityDetails}>'));
  assert.match(header, /<View style=\{c\.identityColumn\}>[\s\S]*identity\.primaryName[\s\S]*!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(header, /savedState\.toggle[\s\S]*Share2/);
  assert.match(style("identityColumn"), /flex:1,minWidth:0/);
});

test("favorite and share behavior and accessibility remain available for normal inventory", () => {
  assert.match(top, /accessibilityRole="button" accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(top, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(top, /onPress=\{savedState\.toggle\}/);
  assert.match(top, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\} onPress=\{share\}/);
  assert.match(source, /Share\.share\(\{ message: result\.modelName, title: result\.modelName \}\)/);
  assert.match(style("action"), /width:28,height:44/);
});

test("Cars card typography uses the shared Inter hierarchy without changing card geometry", () => {
  assert.match(source, /import \{ appFonts \} from "\.\.\/\.\.\/theme\/typography"/);
  assert.match(style("name"), /fontSize:15,fontWeight:"700",fontFamily:appFonts\.bold,lineHeight:18,letterSpacing:-0\.15/);
  assert.match(style("secondaryModel"), /fontSize:15,fontWeight:"700",fontFamily:appFonts\.bold,lineHeight:18,letterSpacing:-0\.15/);
  assert.doesNotMatch(style("name") + style("secondaryModel") + style("category"), /fontWeight:"800"|appFonts\.extraBold/);
  assert.match(style("similar"), /fontSize:11,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:16/);
  assert.match(style("category"), /fontSize:10,fontWeight:"700",fontFamily:appFonts\.bold,letterSpacing:0\.9,lineHeight:15/);
  assert.match(style("sandboxStatus"), /fontSize:10,fontWeight:"600",fontFamily:appFonts\.semibold,lineHeight:14/);
  assert.match(style("meta"), /fontSize:11,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:15/);
  assert.match(style("freeCancellationText"), /fontSize:11,lineHeight:15,fontWeight:"600",fontFamily:appFonts\.semibold/);
  assert.match(style("specText"), /fontSize:11,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:14/);
  assert.match(style("badgeText"), /fontSize:9,fontWeight:"700",fontFamily:appFonts\.bold/);
  assert.match(style("viewDealText"), /fontSize:13,lineHeight:16,fontWeight:"600",fontFamily:appFonts\.semibold/);
});

test("lower band uses provider-aware spec labels in the approved two-column order without an internal divider", () => {
  const firstStart = lower.indexOf('<View style={c.specColumn}>');
  const middleStart = lower.indexOf('<View style={c.specColumn}>', firstStart + 1);
  const commerceStart = lower.indexOf('<View style={c.commerceColumn}>');
  const first = lower.slice(firstStart, middleStart);
  const middle = lower.slice(middleStart, commerceStart);
  const commerce = lower.slice(commerceStart);
  assert.ok(firstStart >= 0 && middleStart > firstStart && commerceStart > middleStart);
  assert.match(source, /const specLabels = nativeCarPrimarySpecLabels\(result\)/);
  assert.match(first, /specLabels\.passengers[\s\S]*specLabels\.transmission/);
  assert.doesNotMatch(first, /specLabels\.doors|specLabels\.bags/);
  assert.match(middle, /specLabels\.doors[\s\S]*specLabels\.bags/);
  assert.doesNotMatch(middle, /specLabels\.passengers|specLabels\.transmission/);
  assert.doesNotMatch(source, /middleSpecColumn/);
  assert.doesNotMatch(style("specColumn"), /borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor/);
  assert.match(source, /const carDividerColor = theme\.dark \? theme\.border : "#CBD5E1"/);
  assert.match(source, /\[c\.lowerBand,\{backgroundColor:carInformationSurface,borderTopColor:carDividerColor\}\]/);
  assert.match(style("lowerBand"), /borderTopWidth:1/);
  assert.match(source, /<View style=\{c\.commerceColumn\}>/);
  assert.doesNotMatch(source, /c\.commerceColumn[^>]*borderLeftColor:carDividerColor/);
  assert.doesNotMatch(style("commerceColumn"), /borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor/);
  assert.match(providerPresentation, /sandboxPresentation\?\.specs/);
  assert.match(providerPresentation, /Passengers not supplied/);
  assert.match(providerPresentation, /Baggage capacity not supplied/);
  assert.match(commerce, /money\(offer\.currency, offer\.pricePerDay\)[\s\S]*>per day<\/Text>[\s\S]*>View deal<\/Text>/);
  assert.doesNotMatch(commerce, /offer\.totalPrice|offer\.taxesAndFeesIncluded|includes taxes & fees|taxes & fees shown where known/);
  assert.equal(source.match(/>View deal<\/Text>/g)?.length, 1);
  assert.doesNotMatch(source, /actionRow|actionVisualSpacer|actionContent|contentColumn|conversion|detailColumn|style=\{c\.specs\}/);
});

test("commerce remains authoritative, responsive, and accessible", () => {
  assert.match(source, /getPrimaryCarOffer\(result\)/);
  assert.match(source, /presentCarOfferCurrency\(primaryOffer, displayCurrency, rates\)/);
  const dailyPriceStart = source.indexOf("money(offer.currency, offer.pricePerDay)");
  const perDayStart = source.indexOf(">per day</Text>", dailyPriceStart);
  const viewDealStart = source.indexOf(">View deal</Text>", perDayStart);
  assert.ok(dailyPriceStart >= 0 && dailyPriceStart < perDayStart && perDayStart < viewDealStart);
  assert.doesNotMatch(source, /money\(offer\.currency, offer\.totalPrice\)|offer\.taxesAndFeesIncluded|includes taxes & fees|taxes & fees shown where known/);
  assert.match(source, /Live price unavailable/);
  assert.match(source, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\}/);
  assert.match(style("commerceColumn"), /flex:1\.35,minWidth:0/);
  assert.match(style("priceColumn"), /minWidth:0,maxWidth:"100%",alignItems:"flex-end"/);
  assert.match(style("dailyPrice"), /maxWidth:"100%",fontSize:19,fontWeight:"600",fontFamily:appFonts\.semibold,lineHeight:22/);
  assert.match(style("dailyPrice"), /fontVariant:\["tabular-nums"\]/);
  assert.doesNotMatch(style("dailyPrice"), /fontSize:22|fontSize:20|fontWeight:"700"/);
  assert.match(style("perDayLabel"), /fontSize:10,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:13,textAlign:"right"/);
  assert.doesNotMatch(style("perDayLabel"), /fontSize:11|lineHeight:14/);
  assert.doesNotMatch(styles, /(?:^|,)total:|taxDisclosure:|(?:^|,)perDay:/);
  assert.match(source, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View deal for \$\{result\.modelName\}`\} onPress=\{onViewDeal\}/);
  assert.match(style("viewDeal"), /minHeight:36/);
  assert.doesNotMatch(source, /result\.offers\[0\]|TOTAL\s*·|\/day/);
});

test("Cars View deal uses the exact Flight Results color contract", () => {
  const colorContract = /theme\.dark \? "#8FB5FF" : ui\.blue/g;
  assert.equal(source.match(colorContract)?.length, 2);
  assert.match(source, /c\.viewDealText,\{color:theme\.dark \? "#8FB5FF" : ui\.blue\}/);
  assert.match(source, /<ChevronRight accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\} color=\{theme\.dark \? "#8FB5FF" : ui\.blue\}/);
  const flightAffordance = flightResultsSource.slice(flightResultsSource.indexOf("s0.flightDetailsAffordanceText"), flightResultsSource.indexOf("s0.flightDetailsAffordanceText") + 500);
  assert.equal(flightAffordance.match(colorContract)?.length, 2);
});

test("location stays above while obsolete benefit contracts remain absent", () => {
  assert.match(top, /<MapPin size=\{13\} color=\{theme\.textPrimary\}[\s\S]*result\.pickupLocation/);
  assert.doesNotMatch(lower, /result\.pickupLocation|MapPin/);
  assert.doesNotMatch(source, /<Fuel|<Gauge|nativeCarFuelPolicyLabel\(|nativeCarMileageLabel\(|fuelPolicyLabel|mileageLabel|rentalBenefits/);
});
