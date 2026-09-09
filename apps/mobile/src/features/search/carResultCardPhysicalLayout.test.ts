import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));
const style = (name: string) => styles.slice(styles.indexOf(`${name}:`), styles.indexOf("},", styles.indexOf(`${name}:`)) + 2);

test("Car card shell and image retain safe physical layout", () => {
  assert.match(source, /c\.card,\{backgroundColor:theme\.surface,borderColor:theme\.dark\?theme\.border:"#D8E1EC",shadowColor:theme\.dark\?"#000000":"#18305B"\}/);
  assert.match(styles, /card:\{borderWidth:1,borderRadius:13,overflow:"hidden",shadowOpacity:0\.08,shadowRadius:10,shadowOffset:\{width:0,height:2\},elevation:2\}/);
  assert.match(styles, /main:\{minHeight:168,flexDirection:"row",alignItems:"stretch"\}/);
  assert.match(styles, /visual:\{width:"40%",minHeight:168/);
  assert.match(styles, /contentColumn:\{flex:1,minWidth:0\}/);
  assert.match(styles, /image:\{\.\.\.StyleSheet\.absoluteFillObject\}/);
  assert.doesNotMatch(styles, /height:\s*"(?:100|68)%"/);
  for (const structuralStyle of ["visual", "contentColumn", "conversion"]) {
    assert.doesNotMatch(style(structuralStyle), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|(?:^|,)height:/);
  }
  assert.doesNotMatch(style("card").replace(/shadowOffset:\{[^}]*\}/, ""), /(?:^|,)height:/);
  for (const naturalHeightStyle of ["main", "visual"]) assert.doesNotMatch(style(naturalHeightStyle), /(?:^|,)height:/);
  assert.doesNotMatch(styles.match(/card:\{[^}]*\}/)?.[0] ?? "", /backgroundColor:"white"|shadowColor:"#0F172A"|height:5/);
});

test("failed Car images reveal the truthful unavailable state", () => {
  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => setImageFailed\(false\), \[imageUri\]\)/);
  assert.match(source, /imageUri && !imageFailed/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, />Vehicle image unavailable<\/Text>/);
});

test("conditional top metadata precedes identity and aligns cancellation with Best value", () => {
  const information = source.indexOf("<View style={c.information}>");
  const topMeta = source.indexOf("<View style={c.topMetaRow}>", information);
  const cancellation = source.indexOf("Free cancellation", topMeta);
  const bestValue = source.indexOf("Best value", topMeta);
  const modelName = source.indexOf("{result.modelName}</Text>", information);
  const header = source.indexOf("<View style={c.headerRow}>", information);
  const actions = source.indexOf("<View style={c.actions}>", header);
  assert.ok(information < topMeta && topMeta < cancellation && cancellation < modelName);
  assert.ok(topMeta < bestValue && bestValue < header && header < actions);
  assert.match(source, /\{offer\?\.freeCancellation \|\| rank === 0 \? <View style=\{c\.topMetaRow\}>/);
  assert.match(source, /topMetaRow[\s\S]*offer\?\.freeCancellation[\s\S]*ShieldCheck[\s\S]*rank === 0[\s\S]*Award[\s\S]*Best value/);
  assert.match(style("topMetaRow"), /flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:4/);
  assert.doesNotMatch(style("topMetaRow"), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:/);
  assert.equal(source.match(/>Best value<\/Text>/g)?.length, 1);
  assert.doesNotMatch(source.slice(header, source.indexOf("style={c.detailColumn}")), /Best value/);
});

test("Free cancellation is canonical, strong, neutral, and not a pill", () => {
  const markup = source.slice(source.indexOf("{offer?.freeCancellation ? <View style={c.freeCancellation}"), source.indexOf("</View> : null}", source.indexOf("{offer?.freeCancellation ? <View style={c.freeCancellation}")) + 19);
  assert.match(markup, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>/);
  assert.match(markup, /<ShieldCheck accessible=\{false\} size=\{13\} strokeWidth=\{2\} color=\{freeCancellationColor\}/);
  assert.match(markup, /c\.freeCancellationText,\{color:freeCancellationColor\}/);
  assert.match(source, /const freeCancellationColor = theme\.dark \? theme\.textPrimary : "#000000"/);
  assert.match(style("freeCancellation"), /minWidth:0,flexShrink:1,flexDirection:"row",alignItems:"center",gap:3/);
  assert.match(style("freeCancellationText"), /fontSize:11,lineHeight:15,fontWeight:"700"/);
  assert.doesNotMatch(markup + style("freeCancellation") + style("freeCancellationText"), /#15803D|#ECFDF5|backgroundColor|border/);
});

test("Best value keeps its green badge while actions remain with identity", () => {
  assert.match(source, /rank === 0 \? <View style=\{c\.badge\}><Award size=\{11\} color="#15803D" \/><Text style=\{c\.badgeText\}>Best value/);
  assert.match(style("badge"), /backgroundColor:"#ECFDF5"/);
  assert.match(style("badgeText"), /color:"#15803D"/);
  assert.match(source, /useSavedCar\(result, searchParams\)/);
  assert.match(source, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(source, /onPress=\{savedState\.toggle\}/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /name="heart"[^>]*size=\{20\}[^>]*color=\{savedState\.saved \? androidFavoriteColors\.savedStroke : androidFavoriteColors\.unsavedStroke\}[^>]*fill=\{savedState\.saved \? androidFavoriteColors\.savedFill : androidFavoriteColors\.unsavedFill\}/);
  assert.doesNotMatch(source, /name="heart"[^>]*(?:fill="(?:transparent|none)"|color=\{savedState\.saved \? "#E92D55" : theme\.icon\})/);
  assert.match(source, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\} onPress=\{share\}/);
  assert.match(source, /<Share2 size=\{18\} color=\{theme\.icon\}/);
  assert.match(source, /Share\.share\(\{ message: result\.modelName, title: result\.modelName \}\)/);
  assert.match(styles, /action:\{width:28,height:44/);
  assert.match(styles, /saveAction:\{alignItems:"flex-end",paddingRight:2\}/);
  assert.match(styles, /shareAction:\{alignItems:"flex-start",paddingLeft:2\}/);
});

test("Results card omits fuel, mileage, and obsolete lower-benefit contracts", () => {
  assert.doesNotMatch(source, /<Fuel|<Gauge|nativeCarFuelPolicyLabel\(|nativeCarMileageLabel\(|fuelPolicyLabel|mileageLabel/);
  assert.doesNotMatch(source, /rentalBenefits|rentalBenefitText|rentalBenefit:/);
  assert.doesNotMatch(source, /import \{[^}]*\b(?:Fuel|Gauge)\b[^}]*\} from "lucide-react-native"/);
});

test("commerce remains exactly once in the lower-right conversion flow", () => {
  const main = source.indexOf("<View style={c.main}>");
  const visual = source.indexOf("<View style={c.visual}>", main);
  const contentColumn = source.indexOf("<View style={c.contentColumn}>", visual);
  const informationStart = source.indexOf("<View style={c.information}>", contentColumn);
  const conversion = source.indexOf("<View style={[c.conversion");
  const priceColumn = source.indexOf("<View style={c.priceColumn}>");
  const information = source.slice(informationStart, conversion);
  assert.ok(main < visual && visual < contentColumn && contentColumn < informationStart && informationStart < conversion && conversion < priceColumn);
  assert.match(source.slice(contentColumn, conversion), /<View style=\{c\.information\}>[\s\S]*<\/View>\s*$/);
  assert.match(source.slice(conversion), /^<View style=\{\[c\.conversion,[\s\S]*<\/View>\s*<\/View>\s*<\/View>\s*<\/View>;/);
  assert.equal(source.match(/<View style=\{c\.priceColumn\}>/g)?.length, 1);
  assert.equal(source.match(/<View style=\{c\.contentColumn\}>/g)?.length, 1);
  assert.doesNotMatch(information, /c\.priceColumn/);
  assert.match(style("conversion"), /flexDirection:"row",alignItems:"flex-end",justifyContent:"flex-end",paddingLeft:10,paddingRight:10,paddingTop:7,paddingBottom:8/);
  assert.doesNotMatch(style("conversion"), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|(?:^|,)height:/);
  assert.match(style("priceColumn"), /flexShrink:0,minWidth:108,maxWidth:"100%",alignItems:"flex-end",justifyContent:"flex-end"/);
  assert.doesNotMatch(style("priceColumn"), /maxWidth:"46%"/);
});

test("commerce preserves authoritative price and CTA contract", () => {
  const start = source.indexOf("<View style={c.priceColumn}>");
  const price = source.slice(start, source.indexOf("</View>\n      </View>", start));
  const ordered = ["offer.totalPrice", "offer.taxesAndFeesIncluded", "offer.pricePerDay", ">View deal</Text>", "<ChevronRight"].map((value) => price.indexOf(value));
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.match(source, /getPrimaryCarOffer\(result\)/);
  assert.match(price, /money\(offer\.currency, offer\.totalPrice\)/);
  assert.match(price, /money\(offer\.currency, offer\.pricePerDay\)\} per day/);
  assert.match(price, /offer\.taxesAndFeesIncluded \? "includes taxes & fees" : "taxes & fees shown where known"/);
  assert.match(price, /Live price unavailable/);
  assert.match(price, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View deal for \$\{result\.modelName\}`\} onPress=\{onViewDeal\}/);
  assert.match(price, /<ChevronRight accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(styles, /total:\{[^}]*fontSize:21,fontWeight:"700",lineHeight:24/);
  assert.match(styles, /taxDisclosure:\{[^}]*fontSize:10,fontWeight:"500",lineHeight:13/);
  assert.match(styles, /perDay:\{[^}]*fontSize:11,fontWeight:"700",lineHeight:14/);
  assert.match(styles, /viewDealText:\{fontSize:13,lineHeight:15,fontWeight:"600"\}/);
  assert.doesNotMatch(source, /result\.offers\[0\]|TOTAL\s*·|\/day/);
});

test("vehicle identity, location, and ordered specs remain intact", () => {
  assert.match(source, /result\.orSimilar \? <>[\s\S]*>or similar<\/Text><Text[^>]*>•<\/Text>[\s\S]*result\.categoryLabel/);
  assert.match(source, /<MapPin size=\{13\} color=\{theme\.textPrimary\}/);
  assert.match(styles, /specs:\{marginTop:7,flexDirection:"column",gap:5\}/);
  const specs = ["result.passengers", "result.doors", "result.transmission", "result.bags"].map((label) => source.indexOf(label, source.indexOf("style={c.specs}")));
  assert.ok(specs.every((index) => index >= 0));
  assert.deepEqual(specs, [...specs].sort((a, b) => a - b));
});
