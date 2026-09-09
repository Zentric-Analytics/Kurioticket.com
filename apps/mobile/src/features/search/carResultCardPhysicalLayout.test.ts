import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));

test("Car card shell uses Flight-family semantic surface separation", () => {
  assert.match(source, /c\.card,\{backgroundColor:theme\.surface,borderColor:theme\.dark\?theme\.border:"#D8E1EC",shadowColor:theme\.dark\?"#000000":"#18305B"\}/);
  assert.match(styles, /card:\{borderWidth:1,borderRadius:13,overflow:"hidden",shadowOpacity:0\.08,shadowRadius:10,shadowOffset:\{width:0,height:2\},elevation:2\}/);
  assert.doesNotMatch(styles.match(/card:\{[^}]*\}/)?.[0] ?? "", /backgroundColor:"white"|shadowColor:"#0F172A"|height:5/);
});

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

test("Car identity and details lead into a shared lower benefits and commerce row", () => {
  const modelName = source.indexOf("{result.modelName}</Text>");
  const identityCategory = source.indexOf("{result.categoryLabel}</Text>");
  const location = source.indexOf("style={c.location}");
  const specs = source.indexOf("style={c.specs}");
  const priceColumn = source.indexOf("style={c.priceColumn}");
  const conversion = source.indexOf("style={[c.conversion");
  const rentalBenefits = source.indexOf("style={c.rentalBenefits}", conversion);

  assert.ok(modelName >= 0 && modelName < identityCategory);
  assert.ok(identityCategory < location && location < specs && specs < conversion);
  assert.ok(conversion < rentalBenefits && rentalBenefits < priceColumn);
  assert.equal(source.match(/<View style=\{c\.priceColumn\}>/g)?.length, 1);
  const information = source.slice(source.indexOf("<View style={c.information}>"), conversion);
  assert.doesNotMatch(information, /<View style=\{c\.priceColumn\}>/);
  assert.match(source, /style=\{c\.identityMeta\}[\s\S]*result\.orSimilar \? <>[\s\S]*>or similar<\/Text><Text[^>]*>•<\/Text>[\s\S]*result\.categoryLabel/);
  assert.match(source, /rank === 0 \? <View style=\{c\.badge\}>[\s\S]*Best value/);
  assert.match(source, /utilityColumn[\s\S]*badge[\s\S]*actions/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\}/);
  assert.match(source, /style=\{c\.rentalBenefits\}[\s\S]*offer\?\.freeCancellation[\s\S]*Free cancellation/);
  assert.doesNotMatch(source, /<Text[^>]*>View car<\/Text>/);
  assert.doesNotMatch(styles, /viewButton|benefitSlot/);
});

test("saved and share actions remain truthful, separate, themed, and visually compact", () => {
  assert.match(source, /useSavedCar\(result, searchParams\)/);
  assert.match(source, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(source, /onPress=\{savedState\.toggle\}/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /name="heart"[^>]*size=\{18\}[^>]*color=\{androidFavoriteColors\.stroke\}[^>]*fill=\{savedState\.saved \? androidFavoriteColors\.savedFill : androidFavoriteColors\.unsavedFill\}/);
  assert.doesNotMatch(source, /name="heart"[^>]*(?:fill="(?:transparent|none)"|color=\{savedState\.saved \? "#E92D55" : theme\.icon\})/);
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
  assert.match(styles, /priceColumn:\{flexShrink:0,minWidth:108,maxWidth:"46%",alignItems:"flex-end",justifyContent:"flex-end"\}/);
  assert.doesNotMatch(styles, /priceColumn:\{[^}]*(?:width:"100%"|paddingTop:10)/);
  assert.doesNotMatch(styles, /priceColumn:\{[^}]*flexBasis:"44%"/);
  assert.doesNotMatch(styles, /priceColumn:\{[^}]*position:"absolute"/);
});

test("rental benefits use canonical facts in stable semantic order", () => {
  assert.match(source, /import \{[^}]*Fuel[^}]*Gauge[^}]*ShieldCheck[^}]*\} from "lucide-react-native"/);
  assert.match(source, /nativeCarFuelPolicyLabel\(result\.fuelPolicy\)/);
  assert.match(source, /nativeCarMileageLabel\(result\)/);

  const cancellation = source.indexOf("<ShieldCheck");
  const fuel = source.indexOf("<Fuel", cancellation);
  const mileage = source.indexOf("<Gauge", fuel);
  assert.ok(cancellation >= 0 && cancellation < fuel && fuel < mileage);
  assert.doesNotMatch(source, /const fuelPolicyLabel\s*=\s*["']Full-to-full/);
  assert.doesNotMatch(source, /const mileageLabel\s*=\s*["']Unlimited mileage/);
});

test("Free cancellation remains truthfully gated and matches the neutral facts without a divider", () => {
  const conversionStyle = styles.slice(styles.indexOf("conversion:"), styles.indexOf("},", styles.indexOf("conversion:")) + 2);
  const benefitMarkup = source.slice(source.indexOf("<View style={c.rentalBenefits}"), source.indexOf("<View style={c.priceColumn}>"));

  assert.match(benefitMarkup, /offer\?\.freeCancellation \? <View style=\{c\.rentalBenefit\}><ShieldCheck accessible=\{false\} size=\{12\} strokeWidth=\{2\} color=\{theme\.icon\} \/><Text style=\{\[c\.rentalBenefitText,\{color:theme\.textSecondary\}\]\}>Free cancellation<\/Text><\/View> : null/);
  assert.doesNotMatch(benefitMarkup, /positiveBenefit|positiveBenefitText|#ECFDF5|#15803D/);
  assert.doesNotMatch(styles, /positiveBenefit(?:Text)?:/);
  assert.doesNotMatch(source, /c\.conversion,\{[^}]*borderTopColor/);
  assert.doesNotMatch(conversionStyle, /borderTopWidth|borderTopColor/);
  assert.doesNotMatch(source, /divider|separatorLine/i);
});

test("shared lower row uses safe flex flow and lets neutral benefits wrap naturally", () => {
  const benefitsStyle = styles.slice(styles.indexOf("rentalBenefits:"), styles.indexOf("},", styles.indexOf("rentalBenefits:")) + 2);
  const conversionStyle = styles.slice(styles.indexOf("conversion:"), styles.indexOf("},", styles.indexOf("conversion:")) + 2);
  const benefitMarkup = source.slice(source.indexOf("<View style={c.rentalBenefits}"), source.indexOf("<View style={c.priceColumn}>"));

  assert.match(conversionStyle, /conversion:\{flexDirection:"row",alignItems:"flex-end",gap:10,paddingLeft:10,paddingRight:10,paddingTop:7,paddingBottom:8\}/);
  assert.match(benefitsStyle, /rentalBenefits:\{flex:1,minWidth:0,flexDirection:"row"/);
  assert.match(benefitsStyle, /flexWrap:"wrap"/);
  assert.match(benefitsStyle, /alignContent:"flex-end"/);
  assert.match(benefitsStyle, /columnGap:8,rowGap:4/);
  assert.match(styles, /rentalBenefitText:\{fontSize:10,fontWeight:"500",lineHeight:14\}/);
  assert.equal(benefitMarkup.match(/style=\{c\.rentalBenefit\}/g)?.length, 3);
  assert.equal(benefitMarkup.match(/size=\{12\} strokeWidth=\{2\} color=\{theme\.icon\}/g)?.length, 3);
  assert.equal(benefitMarkup.match(/style=\{\[c\.rentalBenefitText,\{color:theme\.textSecondary\}\]\}/g)?.length, 3);
  assert.doesNotMatch(benefitsStyle, /width:"33(?:\.333)?%"|flexBasis:"33(?:\.333)?%"|position:"absolute"/);
  assert.doesNotMatch(conversionStyle, /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:/);
  const priceStyle = styles.slice(styles.indexOf("priceColumn:"), styles.indexOf("},", styles.indexOf("priceColumn:")) + 2);
  assert.doesNotMatch(priceStyle, /position:"absolute"|margin(?:Left|Right|Top|Bottom):-|transform:/);
  assert.doesNotMatch(conversionStyle, /(?:^|,)height:/);
  assert.doesNotMatch(benefitMarkup, /ScrollView|numberOfLines|adjustsFontSizeToFit/);
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
