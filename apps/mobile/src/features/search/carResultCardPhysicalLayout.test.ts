import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));

test("compact Car result media cannot create a percentage-height layout loop", () => {
  assert.doesNotMatch(styles, /height:\s*"(?:100|68)%"/);
  assert.match(styles, /main:\{minHeight:168,flexDirection:"row"\}/);
  assert.match(styles, /visual:\{width:"40%",minHeight:168/);
  assert.match(styles, /image:\{\.\.\.StyleSheet\.absoluteFillObject\}/);
});

test("a failed Car image reveals the truthful unavailable state", () => {
  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => setImageFailed\(false\), \[imageUri\]\)/);
  assert.match(source, /imageUri && !imageFailed/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, />Vehicle image unavailable<\/Text>/);
});

test("Car identity, utilities, commerce, and conversion content follow the approved hierarchy", () => {
  const modelName = source.indexOf("{result.modelName}</Text>");
  const identityCategory = source.indexOf("{result.categoryLabel}</Text>");
  const location = source.indexOf("style={c.location}");
  const specs = source.indexOf("style={c.specs}");
  const priceColumn = source.indexOf("style={c.priceColumn}");
  const cancellation = source.indexOf("style={[c.conversion");

  assert.ok(modelName >= 0 && modelName < identityCategory);
  assert.ok(identityCategory < location && location < specs && specs < priceColumn && priceColumn < cancellation);
  assert.match(source, /style=\{c\.identityMeta\}[\s\S]*result\.orSimilar \? <>[\s\S]*>or similar<\/Text><Text[^>]*>•<\/Text>[\s\S]*result\.categoryLabel/);
  assert.match(source, /rank === 0 \? <View style=\{c\.badge\}>[\s\S]*Best value/);
  assert.match(source, /utilityColumn[\s\S]*badge[\s\S]*actions/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\}/);
  assert.match(source, /offer\?\.freeCancellation \? <View style=\{\[c\.conversion[\s\S]*Free cancellation/);
  assert.doesNotMatch(source, /<Text[^>]*>View car<\/Text>/);
  assert.doesNotMatch(styles, /viewButton|benefitSlot/);
});

test("saved and share actions remain truthful, separate, themed, and visually compact", () => {
  assert.match(source, /useSavedCar\(result, searchParams\)/);
  assert.match(source, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(source, /onPress=\{savedState\.toggle\}/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /name="heart"[^>]*fill="transparent"[^>]*color=\{savedState\.saved \? "#E92D55" : theme\.icon\}/);
  assert.doesNotMatch(source, /fill=\{savedState\.saved/);
  assert.match(source, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\} onPress=\{share\}/);
  assert.match(source, /<Share2 size=\{18\} color=\{theme\.icon\}/);
  assert.match(source, /Share\.share\(\{ message: result\.modelName, title: result\.modelName \}\)/);
  assert.match(styles, /action:\{width:28,height:44/);
  assert.match(styles, /saveAction:\{alignItems:"flex-end",paddingRight:2\}/);
  assert.match(styles, /shareAction:\{alignItems:"flex-start",paddingLeft:2\}/);
  assert.doesNotMatch(styles.slice(styles.indexOf("actions:"), styles.indexOf("detailColumn:")), /position:"absolute"|marginLeft:-|left:-|right:-/);
});

test("right commerce column has truthful pricing followed by the Flight-style deal affordance", () => {
  const priceColumnStart = source.indexOf("<View style={c.priceColumn}>");
  const priceColumn = source.slice(priceColumnStart, source.indexOf("</View>\n      </View>", priceColumnStart));
  const ordered = [
    "offer.totalPrice",
    "offer.taxesAndFeesIncluded",
    "offer.pricePerDay",
    ">View deal</Text>",
    "<ChevronRight",
  ].map((value) => priceColumn.indexOf(value));
  assert.ok(ordered.every((index) => index >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.match(priceColumn, /offer\.taxesAndFeesIncluded \? "includes taxes & fees" : "taxes & fees shown where known"/);
  assert.match(priceColumn, /<Text numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.9\} style=\{\[c\.taxDisclosure/);
  assert.doesNotMatch(priceColumn, /<Text numberOfLines=\{2\}[^>]*c\.taxDisclosure/);
  assert.match(priceColumn, /money\(offer\.currency, offer\.pricePerDay\)\} per day/);
  assert.doesNotMatch(source, /TOTAL\s*·|\/day/);
  assert.match(priceColumn, /<Pressable accessibilityRole="button" accessibilityLabel=\{`View deal for \$\{result\.modelName\}`\} onPress=\{onViewDeal\}/);
  assert.match(priceColumn, /<ChevronRight accessible=\{false\} size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(styles, /total:\{[^}]*fontSize:21,fontWeight:"700",lineHeight:24/);
  assert.match(styles, /taxDisclosure:\{[^}]*fontSize:10,fontWeight:"500",lineHeight:13,textAlign:"right"/);
  assert.match(styles, /perDay:\{[^}]*fontSize:11,fontWeight:"700",lineHeight:14,textAlign:"right"/);
  assert.match(styles, /viewDeal:\{[^}]*flexDirection:"row"[^}]*justifyContent:"flex-end"/);
  assert.match(styles, /viewDealText:\{fontSize:13,lineHeight:15,fontWeight:"600"\}/);
  assert.doesNotMatch(styles, /viewDeal:\{[^}]*(?:backgroundColor|borderWidth|borderRadius)/);
  assert.match(styles, /priceColumn:\{width:"100%",minWidth:0,alignItems:"flex-end"/);
  assert.doesNotMatch(styles, /priceColumn:\{[^}]*flexBasis:"44%"/);
  assert.doesNotMatch(styles, /priceColumn:\{[^}]*position:"absolute"/);
});

test("Free cancellation remains truthfully gated without a divider or empty footer", () => {
  const conversionStyle = styles.slice(styles.indexOf("conversion:"), styles.indexOf("},", styles.indexOf("conversion:")) + 2);

  assert.match(source, /offer\?\.freeCancellation \? <View style=\{\[c\.conversion,\{backgroundColor:theme\.surface\}\]\}/);
  assert.match(source, />Free cancellation<\/Text>/);
  assert.doesNotMatch(source, /c\.conversion,\{[^}]*borderTopColor/);
  assert.doesNotMatch(conversionStyle, /borderTopWidth|borderTopColor/);
  assert.doesNotMatch(source, /divider|separatorLine/i);
});

test("Car details use a semantic location pin and an ordered vertical spec list", () => {
  assert.match(source, /<MapPin size=\{13\} color=\{theme\.textPrimary\}/);
  assert.doesNotMatch(source, /<MapPin[^>]*color="#004BB8"/);
  assert.match(styles, /specs:\{marginTop:7,flexDirection:"column",gap:5\}/);
  assert.doesNotMatch(styles, /spec:\{[^}]*width:"50%"/);

  const specLabels = [
    "result.passengers",
    "result.doors",
    "result.transmission",
    "result.bags",
  ].map((label) => source.indexOf(label, source.indexOf("style={c.specs}")));
  assert.ok(specLabels.every((index) => index >= 0));
  assert.deepEqual(specLabels, [...specLabels].sort((a, b) => a - b));
});

test("Car card retains authoritative pricing, saved state, and sharing behavior", () => {
  assert.match(source, /getPrimaryCarOffer\(result\)/);
  assert.doesNotMatch(source, /result\.offers\[0\]/);
  assert.match(source, /money\(offer\.currency, offer\.totalPrice\)/);
  assert.match(source, /money\(offer\.currency, offer\.pricePerDay\)/);
  assert.match(source, /offer\.taxesAndFeesIncluded/);
  assert.match(source, /Live price unavailable/);
  assert.match(source, /Live price unavailable[\s\S]*View deal/);
});
