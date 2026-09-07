import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const cars = read("src/features/search/ApprovedCarResultsScreen.tsx");
const hotels = read("src/features/search/ApprovedResultsScreen.tsx");
const hotelTest = read("src/features/search/hotelResultsFooter.test.ts");

test("Cars mirrors Hotel Back-to-top state and guarded native scroll metrics", () => {
  assert.match(cars, /const CAR_BACK_TO_TOP_HIDE_NEAR_END = 120/);
  assert.match(cars, /const \[carBackToTop,setCarBackToTop\] = useState\(false\)/);
  assert.match(cars, /carBackToTopVisibleRef=useRef\(false\)/);
  assert.match(cars, /carScrollRef=useRef<ScrollView>\(null\)/);
  assert.match(cars, /const insets = useSafeAreaInsets\(\)/);
  const handler = cars.slice(cars.indexOf("const handleCarScroll"), cars.indexOf('if(status==="loading")'));
  assert.match(handler, /event\.nativeEvent\.contentOffset\.y/);
  assert.match(handler, /event\.nativeEvent\.contentSize\.height-event\.nativeEvent\.layoutMeasurement\.height-scrollY/);
  assert.match(handler, /scrollY > 600 && distanceFromEnd > CAR_BACK_TO_TOP_HIDE_NEAR_END/);
  assert.match(handler, /visible===carBackToTopVisibleRef\.current[\s\S]*?setCarBackToTop\(visible\)/);
  assert.match(hotels, /HOTEL_BACK_TO_TOP_HIDE_NEAR_END = 120/);
  assert.match(hotelTest, /hide near the final content/);
});

test("Cars vertical owner is cross-platform stable and safe-area aware", () => {
  const owner = cars.match(/<ScrollView ref=\{carScrollRef\}[^>]*>/)?.[0];
  assert.ok(owner);
  for (const contract of [/alwaysBounceVertical=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/, /scrollEventThrottle=\{16\}/, /onScroll=\{handleCarScroll\}/]) assert.match(owner, contract);
  assert.match(owner, /contentContainerStyle=\{\[r\.body,\{paddingBottom:Math\.max\(insets\.bottom \+ 16,16\)\}\]\}/);
  assert.match(cars, /edges=\{\["top"\]\}/);
  const horizontal = cars.match(/<ScrollView horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  assert.doesNotMatch(horizontal, /carScrollRef|handleCarScroll|alwaysBounceVertical|bounces|overScrollMode/);
  assert.doesNotMatch(cars, /body:\{[^}]*paddingBottom/);
});

test("Cars renders one floating accessible control outside continuous list content", () => {
  assert.equal(cars.match(/accessibilityLabel="Back to top"/g)?.length, 1);
  assert.match(cars, /<\/ScrollView>\s*\{carBackToTop\?<Pressable accessibilityRole="button" accessibilityLabel="Back to top"/);
  assert.match(cars, /scrollTo\(\{y:0,animated:true\}\)/);
  assert.match(cars, /bottom:Math\.max\(insets\.bottom \+ 16,16\)/);
  assert.match(cars, /<ArrowUp size=\{21\} color=\{theme\.icon\}/);
  assert.match(cars, /carBackToTop:\{position:"absolute",right:16,width:44,height:44,borderRadius:22,borderWidth:1,alignItems:"center",justifyContent:"center",zIndex:19,elevation:4\}/);
  assert.match(cars, /filtered\.map\(\(result,index\)/);
  assert.doesNotMatch(cars, /Page \{page\}|label="Previous"|label="Next"/);
});
