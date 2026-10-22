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
  for (const name of ["topSection", "visualColumn", "identityZone", "lowerBand", "specColumn"])
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

test("native Cars information and lower pricing band use the Hotels white surface while imagery stays separate", () => {
  assert.match(source, /const carInformationSurface = theme\.dark \? resultBackgroundColor : "#FFFFFF"/);
  assert.doesNotMatch(source, /const carInformationSurface = theme\.dark \? resultBackgroundColor : "#E7EBF1"/);
  assert.match(priceAlertSource, /theme\.dark \? "#465269" : "#CBD5E1"/);
  assert.match(source, /\[c\.identityZone,\{backgroundColor:carInformationSurface\}\]/);
  assert.match(source, /\[c\.lowerBand,\{backgroundColor:carInformationSurface,borderTopColor:carDividerColor\}\]/);
  assert.match(source, /\[c\.card,\{backgroundColor:carInformationSurface,borderColor:/);
  assert.doesNotMatch(source, /c\.visualColumn,\{backgroundColor:carInformationSurface\}/);
  assert.match(source, /c\.visualColumn,\{backgroundColor:theme\.surface\}/);
  assert.match(source, /const carDividerColor = theme\.dark \? theme\.border : "#CBD5E1"/);
  assert.match(style("card"), /borderWidth:1,borderRadius:13,overflow:"hidden"/);
});

test("top section owns imagery, identity and the four vehicle specifications", () => {
  assert.ok(topStart >= 0 && lowerStart > topStart);
  assert.match(top, /c\.visualColumn[\s\S]*<View style=\{\[c\.identityZone,\{backgroundColor:carInformationSurface\}\]\}>/);
  for (const token of ["identity.primaryName", "identity.secondaryModel", "or similar", "categoryLabel", "result.pickupLocation", "savedState.toggle", "Share2", "Free cancellation"])
    assert.ok(top.includes(token), `missing ${token} from top section`);
  assert.match(source, /const categoryLabel = sandbox && result\.categoryLabel\.trim\(\) === "Category not supplied" \? "" : result\.categoryLabel/);
  assert.doesNotMatch(top, /result\.passengers|result\.doors|result\.transmission|result\.bags|offer\.totalPrice|offer\.pricePerDay|>View deal<\/Text>/);
  assert.doesNotMatch(source, /topMetaShell|topMetaRow|topMetaContent|hasTopMeta/);
});

test("Cheapest badge reflects price while sandbox cards omit authored sandbox status copy", () => {
  const bestValueStart = source.indexOf("badge && BadgeIcon ? <View");
  const headerStart = source.indexOf('<View style={c.headerRow}>', bestValueStart);
  const detailsStart = source.indexOf('<View style={c.identityDetails}>', headerStart);
  const locationStart = source.indexOf('<View style={c.location}>', detailsStart);
  const freeCancellationStart = source.indexOf("offer?.freeCancellation", locationStart);
  assert.ok(bestValueStart >= 0 && bestValueStart < headerStart);
  assert.ok(headerStart < detailsStart && detailsStart < locationStart && locationStart < freeCancellationStart);
    assert.match(source, /badge && BadgeIcon \? <View/);
  assert.doesNotMatch(source, /KAYAK sandbox · Simulated · Not bookable|sandboxStatus/);
  assert.match(source, /<View style=\{c\.utilityColumn\}>/);
  assert.doesNotMatch(source, /!sandbox \? <View style=\{c\.utilityColumn\}>/);
  assert.match(top, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>[\s\S]*ShieldCheck[\s\S]*Free cancellation/);
  assert.match(source, /const freeCancellationColor = theme\.dark \? theme\.textPrimary : "#000000"/);
  assert.doesNotMatch(style("freeCancellation") + style("freeCancellationText"), /#15803D|#ECFDF5|backgroundColor|border/);
  assert.match(style("badge"), /backgroundColor:"#ECFDF5"/);
  assert.match(style("badgeText"), /color:"#15803D"/);
  assert.match(style("bestValueRow"), /alignItems:"flex-end"/);
  assert.equal(source.match(/>Free cancellation<\/Text>/g)?.length, 1);
  assert.match(source, /carBadgeIcons =/);
  assert.doesNotMatch(source, /benefits/);
  for (const name of ["bestValueRow", "badge"])
    assert.doesNotMatch(style(name), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translate/);
});

test("name and save/share controls remain siblings for all inventory", () => {
  const header = top.slice(top.indexOf('<View style={c.headerRow}>'), top.indexOf('<View style={c.identityDetails}>'));
  assert.match(header, /<View style=\{c\.identityColumn\}>[\s\S]*identity\.primaryName[\s\S]*<View style=\{c\.utilityColumn\}>/);
  assert.match(header, /savedState\.toggle[\s\S]*Share2/);
  assert.match(style("identityColumn"), /flex:1,minWidth:0/);
});

test("favorite and share behavior and accessibility remain available for normal and sandbox inventory", () => {
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
  assert.doesNotMatch(styles, /sandboxStatus:/);
  assert.match(style("meta"), /fontSize:11,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:15/);
  assert.match(style("freeCancellationText"), /fontSize:11,lineHeight:15,fontWeight:"600",fontFamily:appFonts\.semibold/);
  assert.match(style("specText"), /fontSize:11,fontWeight:"500",fontFamily:appFonts\.medium,lineHeight:14/);
  assert.match(style("badgeText"), /fontSize:9,fontWeight:"700",fontFamily:appFonts\.bold/);
});

test("native Cars footer uses full-width provider offers without duplicated commerce", () => {
  assert.match(style("detailsColumn"), /flex:1,minWidth:0,paddingHorizontal:8,paddingVertical:6/);
  assert.match(lower, /<NativeCarResultOfferPicker result=\{result\} displayCurrency=\{displayCurrency\} rates=\{rates\}/);
  assert.doesNotMatch(lower, /commerceColumn|priceColumn|primaryBookingUrl/);
  assert.doesNotMatch(styles, /commerceColumn:|dailyPrice:|perDayLabel:/);
  assert.match(source, /useCarDisplayCurrency\(\)/);
  assert.match(source, /getPrimaryCarOffer\(result\)/);
});
test("location stays above while obsolete benefit contracts remain absent", () => {
  assert.match(top, /<MapPin size=\{13\} color=\{theme\.textPrimary\}[\s\S]*result\.pickupLocation/);
  assert.doesNotMatch(lower, /result\.pickupLocation|MapPin/);
  assert.doesNotMatch(source, /<Fuel|<Gauge|nativeCarFuelPolicyLabel\(|nativeCarMileageLabel\(|fuelPolicyLabel|mileageLabel|rentalBenefits/);
});

test("pickup pin aligns to the first line while long locations keep wrapping", () => {
  assert.match(source, /<View style=\{c\.location\}><MapPin size=\{13\} color=\{theme\.textPrimary\} style=\{c\.locationIcon\} \/><Text style=\{\[c\.meta,/);
  assert.match(style("location"), /flexDirection:"row",alignItems:"flex-start",gap:4/);
  assert.doesNotMatch(style("location"), /alignItems:"center"/);
  assert.match(style("locationIcon"), /marginTop:1/);
  assert.match(style("meta"), /flex:1,minWidth:0[^}]*lineHeight:15/);
  const locationMarkup = source.slice(source.indexOf('<View style={c.location}>'), source.indexOf('</View>', source.indexOf('<View style={c.location}>')));
  assert.doesNotMatch(locationMarkup, /numberOfLines|ellipsizeMode/);
});
