import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));
const style = (name: string) => styles.slice(styles.indexOf(`${name}:`), styles.indexOf("},", styles.indexOf(`${name}:`)) + 2);
const top = source.slice(source.indexOf('<View style={c.topSection}>'), source.indexOf('<View style={[c.lowerBand,{borderTopColor:theme.border}]}>'));
const lower = source.slice(source.indexOf('<View style={[c.lowerBand,{borderTopColor:theme.border}]}>'), source.indexOf("  </View>;"));

test("Car card shell and two-level grid retain safe natural layout", () => {
  assert.match(source, /c\.card,\{backgroundColor:resultBackgroundColor,borderColor:theme\.dark\?theme\.border:"#D8E1EC",shadowColor:theme\.dark\?"#000000":"#18305B"\}/);
  assert.match(style("card"), /borderWidth:1,borderRadius:13,overflow:"hidden"/);
  assert.match(style("topSection"), /minHeight:156,flexDirection:"row",alignItems:"stretch"/);
  assert.match(style("visualColumn"), /width:"40%",minHeight:156,padding:6/);
  assert.match(style("lowerBand"), /flexDirection:"row",alignItems:"stretch",borderTopWidth:StyleSheet\.hairlineWidth/);
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

test("top section owns only the visual and identity information", () => {
  assert.match(top, /c\.visualColumn[\s\S]*<View style=\{c\.identityZone\}>/);
  for (const token of ["identity.primaryName", "identity.secondaryModel", "or similar", "result.categoryLabel", "result.pickupLocation", "savedState.toggle", "Share2", "Free cancellation", "Best value"])
    assert.ok(top.includes(token), `missing ${token} from top section`);
  assert.doesNotMatch(top, /result\.passengers|result\.doors|result\.transmission|result\.bags|offer\.totalPrice|offer\.pricePerDay|>View deal<\/Text>/);
  assert.doesNotMatch(source, /topMetaShell|topMetaRow|topMetaContent|hasTopMeta/);
});

test("Free cancellation and Best value preserve conditional styling and occur once", () => {
  assert.match(top, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>[\s\S]*ShieldCheck[\s\S]*Free cancellation/);
  assert.match(source, /const freeCancellationColor = theme\.dark \? theme\.textPrimary : "#000000"/);
  assert.doesNotMatch(style("freeCancellation") + style("freeCancellationText"), /#15803D|#ECFDF5|backgroundColor|border/);
  assert.match(top, /rank === 0 \? <View style=\{c\.badge\}><Award size=\{11\} color="#15803D" \/><Text style=\{c\.badgeText\}>Best value/);
  assert.match(style("badge"), /backgroundColor:"#ECFDF5"/);
  assert.match(style("badgeText"), /color:"#15803D"/);
  assert.equal(source.match(/>Free cancellation<\/Text>/g)?.length, 1);
  assert.equal(source.match(/>Best value<\/Text>/g)?.length, 1);
});

test("favorite and share behavior and accessibility remain in the top-right", () => {
  assert.match(top, /accessibilityRole="button" accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(top, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(top, /onPress=\{savedState\.toggle\}/);
  assert.match(top, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\} onPress=\{share\}/);
  assert.match(source, /Share\.share\(\{ message: result\.modelName, title: result\.modelName \}\)/);
  assert.match(style("action"), /width:28,height:44/);
});

test("lower band has the approved two spec columns and commerce column", () => {
  const firstStart = lower.indexOf('<View style={c.specColumn}>');
  const middleStart = lower.indexOf('<View style={[c.specColumn,c.middleSpecColumn');
  const commerceStart = lower.indexOf('<View style={[c.commerceColumn');
  const first = lower.slice(firstStart, middleStart);
  const middle = lower.slice(middleStart, commerceStart);
  const commerce = lower.slice(commerceStart);
  assert.match(first, /result\.passengers[\s\S]*result\.transmission/);
  assert.doesNotMatch(first, /result\.doors|result\.bags/);
  assert.match(middle, /result\.doors[\s\S]*result\.bags/);
  assert.doesNotMatch(middle, /result\.passengers|result\.transmission/);
  assert.match(commerce, /offer\.totalPrice[\s\S]*offer\.taxesAndFeesIncluded[\s\S]*offer\.pricePerDay[\s\S]*>View deal<\/Text>/);
  assert.equal(source.match(/>View deal<\/Text>/g)?.length, 1);
  assert.doesNotMatch(source, /actionRow|actionVisualSpacer|actionContent|contentColumn|conversion|detailColumn|style=\{c\.specs\}/);
});

test("commerce remains authoritative, responsive, and accessible", () => {
  assert.match(source, /getPrimaryCarOffer\(result\)/);
  assert.match(source, /presentCarOfferCurrency\(primaryOffer, displayCurrency, rates\)/);
  assert.match(source, /money\(offer\.currency, offer\.totalPrice\)/);
  assert.match(source, /offer\.taxesAndFeesIncluded \? "includes taxes & fees" : "taxes & fees shown where known"/);
  assert.match(source, /money\(offer\.currency, offer\.pricePerDay\)\} per day/);
  assert.match(source, /Live price unavailable/);
  assert.match(source, /numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.75\}/);
  assert.match(style("commerceColumn"), /flex:1\.35,minWidth:0/);
  assert.match(style("priceColumn"), /minWidth:0,maxWidth:"100%",alignItems:"flex-end"/);
  assert.match(source, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View deal for \$\{result\.modelName\}`\} onPress=\{onViewDeal\}/);
  assert.match(style("viewDeal"), /minHeight:36/);
  assert.doesNotMatch(source, /result\.offers\[0\]|TOTAL\s*·|\/day/);
});

test("location stays above while obsolete benefit contracts remain absent", () => {
  assert.match(top, /<MapPin size=\{13\} color=\{theme\.textPrimary\}[\s\S]*result\.pickupLocation/);
  assert.doesNotMatch(lower, /result\.pickupLocation|MapPin/);
  assert.doesNotMatch(source, /<Fuel|<Gauge|nativeCarFuelPolicyLabel\(|nativeCarMileageLabel\(|fuelPolicyLabel|mileageLabel|rentalBenefits/);
});
