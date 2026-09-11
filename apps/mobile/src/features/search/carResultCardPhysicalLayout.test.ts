import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));
const style = (name: string) => styles.slice(styles.indexOf(`${name}:`), styles.indexOf("},", styles.indexOf(`${name}:`)) + 2);

test("Car card shell and inset image retain safe physical layout", () => {
  assert.match(source, /c\.card,\{backgroundColor:theme\.surface,borderColor:theme\.dark\?theme\.border:"#D8E1EC",shadowColor:theme\.dark\?"#000000":"#18305B"\}/);
  assert.match(styles, /card:\{borderWidth:1,borderRadius:13,overflow:"hidden",shadowOpacity:0\.08,shadowRadius:10,shadowOffset:\{width:0,height:2\},elevation:2\}/);
  assert.match(style("main"), /minHeight:168,flexDirection:"row",alignItems:"stretch"/);
  assert.match(style("visualColumn"), /width:"40%",minHeight:168,paddingLeft:6,paddingRight:6,paddingBottom:8/);
  assert.match(style("visual"), /flex:1,backgroundColor:"#F8FAFC",overflow:"hidden",borderRadius:10/);
  assert.match(styles, /contentColumn:\{flex:1,minWidth:0\}/);
  assert.match(styles, /image:\{\.\.\.StyleSheet\.absoluteFillObject\}/);
  for (const structuralStyle of ["topMetaShell", "main", "visualColumn", "visual", "contentColumn", "conversion"]) {
    assert.doesNotMatch(style(structuralStyle), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translateY/);
  }
  assert.doesNotMatch(style("card").replace(/shadowOffset:\{[^}]*\}/, ""), /(?:^|,)height:/);
  for (const naturalHeightStyle of ["main", "visualColumn"]) assert.doesNotMatch(style(naturalHeightStyle), /(?:^|,)height:/);
});

test("failed Car images reveal the truthful unavailable state", () => {
  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => setImageFailed\(false\), \[imageUri\]\)/);
  assert.match(source, /imageUri && !imageFailed/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, />Vehicle image unavailable<\/Text>/);
});

test("only the Best value badge creates top metadata above the shared body", () => {
  const topMetaShell = source.indexOf("<View style={c.topMetaShell}>");
  const topMeta = source.indexOf("<View style={c.topMetaRow}>", topMetaShell);
  const main = source.indexOf("<View style={c.main}>", topMeta);
  const visualColumn = source.indexOf("c.visualColumn", main);
  const header = source.indexOf("<View style={c.headerRow}>", main);
  const bestValue = source.indexOf("Best value", topMeta);
  const topMetaMarkup = source.slice(topMetaShell, main);
  assert.ok(topMetaShell < topMeta && topMeta < bestValue && bestValue < main);
  assert.ok(main < visualColumn && main < header);
  assert.match(source, /const hasTopBadge = rank === 0/);
  assert.match(source, /\{hasTopBadge \? <View style=\{c\.topMetaShell\}>/);
  assert.doesNotMatch(source, /hasTop(?:Meta|Badge)\s*=\s*[^;]*freeCancellation/);
  assert.match(source, /topMetaVisualSpacer:\{width:"40%"\}/);
  assert.match(style("topMetaContent"), /flex:1,minWidth:0,paddingHorizontal:10,paddingTop:9,paddingBottom:4/);
  assert.match(style("topMetaRow"), /justifyContent:"flex-end"/);
  assert.match(topMetaMarkup, /<View style=\{c\.topMetaRow\}>[\s\S]*rank === 0[\s\S]*Award[\s\S]*Best value/);
  assert.doesNotMatch(topMetaMarkup, /freeCancellation|Free cancellation|ShieldCheck/);
  assert.doesNotMatch(source.slice(main), /c\.topMetaRow/);
  assert.doesNotMatch(style("topMetaShell") + style("topMetaRow"), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:/);
  assert.equal(source.match(/>Best value<\/Text>/g)?.length, 1);
});

test("Free cancellation is canonical, strong, neutral, and not a pill", () => {
  const markup = source.slice(source.indexOf("{offer?.freeCancellation ? <View style={c.freeCancellation}"), source.indexOf("</View> : null}", source.indexOf("{offer?.freeCancellation ? <View style={c.freeCancellation}")) + 19);
  assert.match(markup, /offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>/);
  assert.match(markup, /<ShieldCheck accessible=\{false\} size=\{13\} strokeWidth=\{2\} color=\{freeCancellationColor\}/);
  assert.match(markup, /c\.freeCancellationText,\{color:freeCancellationColor\}/);
  assert.match(source, /const freeCancellationColor = theme\.dark \? theme\.textPrimary : "#000000"/);
  assert.match(style("freeCancellation"), /minWidth:0,flexShrink:1,flexDirection:"row",alignItems:"center",alignSelf:"flex-end",gap:3,marginTop:3/);
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
  assert.match(style("action"), /width:28,height:44,justifyContent:"flex-start"/);
  assert.doesNotMatch(style("action") + style("saveAction") + style("shareAction"), /margin(?:Left|Right|Top|Bottom):-|transform:|position:"absolute"/);
  assert.match(styles, /saveAction:\{alignItems:"flex-end",paddingRight:2\}/);
  assert.match(styles, /shareAction:\{alignItems:"flex-start",paddingLeft:2\}/);
});

test("Results card omits fuel, mileage, and obsolete lower-benefit contracts", () => {
  assert.doesNotMatch(source, /<Fuel|<Gauge|nativeCarFuelPolicyLabel\(|nativeCarMileageLabel\(|fuelPolicyLabel|mileageLabel/);
  assert.doesNotMatch(source, /rentalBenefits|rentalBenefitText|rentalBenefit:/);
  assert.doesNotMatch(source, /import \{[^}]*\b(?:Fuel|Gauge)\b[^}]*\} from "lucide-react-native"/);
});

test("View deal and Free cancellation are structurally outside the image-height body", () => {
  const topMeta = source.indexOf("<View style={c.topMetaShell}>");
  const main = source.indexOf("<View style={c.main}>");
  const visualColumn = source.indexOf("c.visualColumn", main);
  const contentColumn = source.indexOf("<View style={c.contentColumn}>", visualColumn);
  const conversion = source.indexOf("<View style={[c.conversion", contentColumn);
  const priceColumn = source.indexOf("<View style={c.priceColumn}>", conversion);
  const actionRow = source.indexOf("<View style={c.actionRow}>", priceColumn);
  const viewDeal = source.indexOf(">View deal</Text>", actionRow);
  const cancellation = source.indexOf(">Free cancellation</Text>", viewDeal);
  assert.ok(topMeta < main && main < visualColumn && visualColumn < contentColumn);
  assert.ok(contentColumn < conversion && conversion < priceColumn && priceColumn < actionRow && actionRow < viewDeal && viewDeal < cancellation);
  const body = source.slice(main, actionRow);
  const action = source.slice(actionRow, source.indexOf("  </View>;", actionRow));
  assert.equal(body.match(/<View style=\{\[c\.visualColumn,/g)?.length, 1);
  assert.doesNotMatch(body, />View deal<|c\.viewDeal|>Free cancellation<|c\.freeCancellation/);
  assert.doesNotMatch(action, /c\.visualColumn|c\.contentColumn|c\.priceColumn/);
  assert.match(action, /c\.viewDeal[\s\S]*offer\?\.freeCancellation \? <View style=\{c\.freeCancellation\}>[\s\S]*Free cancellation/);
  assert.equal(source.match(/>View deal<\/Text>/g)?.length, 1);
  assert.equal(source.match(/>Free cancellation<\/Text>/g)?.length, 1);
  assert.equal(source.match(/<View style=\{c\.priceColumn\}>/g)?.length, 1);
  assert.equal(source.match(/<View style=\{c\.contentColumn\}>/g)?.length, 1);
});

test("dedicated action row preserves right-column geometry without layout hacks", () => {
  assert.match(style("actionRow"), /flexDirection:"row"/);
  assert.match(style("actionVisualSpacer"), /width:"40%"/);
  assert.match(style("actionContent"), /flex:1,minWidth:0,paddingLeft:10,paddingRight:10,paddingBottom:8/);
  for (const structuralStyle of ["actionRow", "actionVisualSpacer", "actionContent", "viewDeal", "freeCancellation"])
    assert.doesNotMatch(style(structuralStyle), /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:|translateY|(?:^|,)height:/);
  assert.match(style("freeCancellation"), /alignSelf:"flex-end"/);
  const cancellationGap = /marginTop:(\d+)/.exec(style("freeCancellation"));
  assert.ok(cancellationGap && Number(cancellationGap[1]) > 0);
  const actionBottomPadding = /paddingBottom:(\d+)/.exec(style("actionContent"));
  assert.ok(actionBottomPadding && Number(actionBottomPadding[1]) > 0);
  const visualBottomPadding = /paddingBottom:(\d+)/.exec(style("visualColumn"));
  assert.ok(visualBottomPadding && Number(visualBottomPadding[1]) <= 12);
});

test("commerce preserves authoritative price and CTA contract", () => {
  const priceStart = source.indexOf("<View style={c.priceColumn}>");
  const priceEnd = source.indexOf("</View>\n        </View>", priceStart);
  const price = source.slice(priceStart, priceEnd);
  const actionStart = source.indexOf("<View style={c.actionRow}>", priceEnd);
  const action = source.slice(actionStart, source.indexOf("  </View>;", actionStart));
  const ordered = ["offer.totalPrice", "offer.taxesAndFeesIncluded", "offer.pricePerDay"].map((value) => price.indexOf(value));
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.doesNotMatch(price, /View deal|c\.viewDeal/);
  assert.match(source, /getPrimaryCarOffer\(result\)/);
  assert.match(price, /money\(offer\.currency, offer\.totalPrice\)/);
  assert.match(price, /money\(offer\.currency, offer\.pricePerDay\)\} per day/);
  assert.match(price, /offer\.taxesAndFeesIncluded \? "includes taxes & fees" : "taxes & fees shown where known"/);
  assert.match(price, /Live price unavailable/);
  assert.match(action, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View deal for \$\{result\.modelName\}`\} onPress=\{onViewDeal\}/);
  assert.match(action, /<ChevronRight accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(style("conversion"), /flexDirection:"row",alignItems:"flex-end",justifyContent:"flex-end",paddingLeft:10,paddingRight:10,paddingTop:7,paddingBottom:4/);
  assert.match(style("priceColumn"), /flexShrink:0,minWidth:108,maxWidth:"100%",alignItems:"flex-end",justifyContent:"flex-end"/);
  assert.match(style("viewDeal"), /minHeight:36,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4/);
  assert.doesNotMatch(style("viewDeal"), /marginTop:/);
  assert.match(action, /hitSlop=\{\{top:4,bottom:4,left:4,right:4\}\}/);
  assert.match(styles, /total:\{[^}]*fontSize:21,fontWeight:"700",lineHeight:24/);
  assert.match(styles, /taxDisclosure:\{[^}]*fontSize:10,fontWeight:"500",lineHeight:13/);
  assert.match(styles, /perDay:\{[^}]*fontSize:11,fontWeight:"700",lineHeight:14/);
  assert.match(styles, /viewDealText:\{fontSize:13,lineHeight:15,fontWeight:"600"\}/);
  assert.doesNotMatch(source, /result\.offers\[0\]|TOTAL\s*·|\/day/);
});

test("vehicle identity, location, and ordered specs remain intact", () => {
  assert.match(source, /const identity = nativeCarResultIdentity\(result\.modelName\)/);
  assert.match(source, /<Text numberOfLines=\{1\} style=\{\[c\.name,[^>]*>\{identity\.primaryName\}<\/Text>/);
  assert.doesNotMatch(source, /style=\{\[c\.name,[^>]*>\{result\.modelName\}<\/Text>/);
  const identityLineStart = source.indexOf('<Text numberOfLines={1} style={c.identityLine}>');
  const identityLineEnd = source.indexOf("\n            </Text> : null}", identityLineStart) + 20;
  const identityLine = source.slice(identityLineStart, identityLineEnd);
  const orderedIdentity = ["identity.secondaryModel", "or similar"].map((value) => identityLine.indexOf(value));
  assert.ok(identityLineStart >= 0 && orderedIdentity.every((index) => index >= 0));
  assert.deepEqual(orderedIdentity, [...orderedIdentity].sort((a, b) => a - b));
  assert.match(source.slice(source.indexOf("{identity.secondaryModel || result.orSimilar"), identityLineStart), /\{identity\.secondaryModel \|\| result\.orSimilar \?\s*$/);
  assert.doesNotMatch(identityLine, /result\.categoryLabel|\{"•"\}|[·|]/);
  assert.doesNotMatch(identityLine, /["'] - ["']/);
  const categoryRow = '<Text numberOfLines={1} style={c.category}>{result.categoryLabel}</Text>';
  const categoryRowStart = source.indexOf(categoryRow, identityLineEnd);
  assert.ok(categoryRowStart > identityLineEnd);
  assert.doesNotMatch(source.slice(identityLineStart, categoryRowStart + categoryRow.length), /c\.separator|\{"•"\}/);
  assert.doesNotMatch(styles, /separator:\{/);
  assert.match(style("identityLine"), /minWidth:0,lineHeight:18/);
  assert.doesNotMatch(style("identityLine"), /flexWrap:"wrap"/);
  assert.match(style("secondaryModel"), /fontSize:15,fontWeight:"800",lineHeight:18/);
  assert.match(style("similar"), /fontSize:11,fontWeight:"500",lineHeight:16/);
  assert.match(style("category"), /fontSize:10,fontWeight:"800",letterSpacing:1\.1,lineHeight:16,textTransform:"uppercase",color:"#004BB8"/);
  assert.match(source, /<MapPin size=\{13\} color=\{theme\.textPrimary\}/);
  assert.match(style("detailColumn"), /minWidth:0,marginTop:7/);
  assert.match(style("specs"), /marginTop:7,flexDirection:"column",gap:7/);
  assert.match(style("meta"), /fontSize:11,fontWeight:"500",lineHeight:15/);
  assert.match(style("specText"), /fontSize:11,fontWeight:"500",lineHeight:14/);
  const location = source.indexOf("result.pickupLocation");
  const specsStart = source.indexOf("style={c.specs}");
  const specs = ["result.passengers", "result.doors", "result.transmission", "result.bags"].map((label) => source.indexOf(label, specsStart));
  assert.ok(location >= 0 && location < specsStart);
  assert.ok(specs.every((index) => index >= 0));
  assert.deepEqual(specs, [...specs].sort((a, b) => a - b));
});
