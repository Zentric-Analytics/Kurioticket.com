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
  const details = source.indexOf("style={c.detailCommerceRow}");
  const conversion = source.indexOf("style={[c.conversion");

  assert.ok(modelName >= 0 && modelName < identityCategory);
  assert.ok(identityCategory < details && details < conversion);
  assert.match(source, /style=\{c\.identityMeta\}[\s\S]*result\.orSimilar \? <>[\s\S]*>or similar<\/Text><Text[^>]*>•<\/Text>[\s\S]*result\.categoryLabel/);
  assert.match(source, /rank === 0 \? <View style=\{c\.badge\}>[\s\S]*Best value/);
  assert.match(source, /utilityColumn[\s\S]*badge[\s\S]*actions/);
  assert.match(source, /accessibilityLabel=\{savedState\.saved \? `Remove \$\{result\.modelName\} from saved` : `Save \$\{result\.modelName\}`\}/);
  assert.match(source, /accessibilityLabel=\{`Share \$\{result\.modelName\}`\}/);
  assert.match(source, /detailCommerceRow[\s\S]*priceColumn[\s\S]*offer\.totalPrice[\s\S]*offer\.pricePerDay/);
  assert.match(source, /conversion[\s\S]*offer\?\.freeCancellation[\s\S]*Free cancellation[\s\S]*View car/);
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
  assert.match(source, /Live price unavailable/);
  assert.match(source, /useSavedCar\(result, searchParams\)/);
  assert.match(source, /accessibilityState=\{\{ selected: savedState\.saved \}\}/);
  assert.match(source, /Share\.share\(\{ message: result\.modelName, title: result\.modelName \}\)/);
});
