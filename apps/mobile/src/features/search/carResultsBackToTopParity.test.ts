import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cars = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8").replace(/\r\n/g, "\n");
const stateSource = readFileSync("src/features/search/carResultsBackToTopState.ts", "utf8");

test("Native Cars Results exposes one floating Back-to-top after a meaningful scroll", () => {
  assert.match(stateSource, /const CAR_BACK_TO_TOP_SCROLL_THRESHOLD = 240/);
  assert.match(cars, /carBackToTopOffsetRef=useRef\(0\)/);
  assert.match(cars, /carBackToTopVisibleRef=useRef\(false\)/);
  assert.match(cars, /carBackToTopReturningRef=useRef\(false\)/);
  assert.match(cars, /const handleCarScroll=useCallback\(/);
  assert.match(cars, /const next=updateCarBackToTopScroll\(\{/);
  assert.match(stateSource, /offset > CAR_BACK_TO_TOP_SCROLL_THRESHOLD/);
  assert.match(cars, /if\(next\.visible!==carBackToTopVisibleRef\.current\)/);
  assert.match(cars, /setCarBackToTopVisible\(next\.visible\)/);
  assert.match(cars, /carBackToTopVisible && status==="ready" && !carResultsApplying/);
  assert.equal((cars.match(/accessibilityLabel="Back to top"/g) ?? []).length, 1);
  assert.match(cars, /accessibilityRole="button" accessibilityLabel="Back to top"/);
  assert.match(cars, /accessibilityHint="Scroll to the beginning of car results"/);
  assert.match(cars, /<ArrowUp accessible=\{false\} size=\{18\} strokeWidth=\{2\.2\}/);
  assert.match(cars, /carBackToTop:\{position:"absolute",right:16,width:44,height:44,[^}]*borderRadius:12,borderWidth:1,zIndex:20,elevation:5/);
  assert.match(cars, /bottom:Math\.max\(insets\.bottom,0\)\+16/);
  assert.match(cars, /paddingBottom:Math\.max\(insets\.bottom \+ 64,64\)/);
  assert.match(cars, /theme\.dark\?theme\.surface:"#EEF2F6"/);
  assert.match(cars, /theme\.dark\?theme\.textPrimary:"#004BB8"/);
});

test("Native Cars Back-to-top uses its existing FlatList, smooth movement and no transient reappearance", () => {
  assert.match(cars, /const scrollCarResultsToTop=useCallback\(\(\)=>\{/);
  assert.match(cars, /const next=beginCarBackToTopReturn\(\{[\s\S]*carBackToTopReturningRef\.current=next\.returning;[\s\S]*hideCarBackToTop\(\);[\s\S]*carScrollRef\.current\?\.scrollToOffset\(\{offset:0,animated:true\}\)/);
  assert.match(stateSource, /const returning = previous\.returning && offset > 1 && offset <= previous\.offset \+ 1/);
  assert.match(stateSource, /returning: previous\.offset > 1/);
  assert.match(cars, /onScrollBeginDrag=\{\(\)=>\{carBackToTopReturningRef\.current=false;\}\}/);
  assert.match(cars, /onPress=\{scrollCarResultsToTop\}/);
  assert.match(cars, /startCarResultsTransition=\(\)=>\{[^}]*scrollCarResultsToTop\(\)/);
  assert.match(cars, /setCarBackToTopVisible\(false\)/);
  assert.match(cars, /carBackToTopReturningRef\.current=false;carBackToTopOffsetRef\.current=0;setCarBackToTopVisible\(false\)/);
});

test("Cars retains its scroll ref and legitimate transition positioning", () => {
  assert.match(cars, /carScrollRef=useRef<FlatList<CarResult>>\(null\)/);
  assert.match(cars, /ref=\{carScrollRef\}/);
  assert.match(cars, /startCarResultsTransition=.*?scrollCarResultsToTop\(\)/);
  assert.match(cars, /onApplySort=.*?startCarResultsTransition\(\)/);
  assert.doesNotMatch(cars.match(/onApplySort=\{\(next\)=>\{[\s\S]*?\}\}/)?.[0] ?? "", /scrollTo/);
});

test("Cars vertical owner is cross-platform stable, virtualized, and safe-area aware", () => {
  const start = cars.indexOf("<FlatList ref={carScrollRef}");
  const contentStyleStart = cars.indexOf("contentContainerStyle=", start);
  const owner = cars.slice(start, cars.indexOf("/>", contentStyleStart) + 2);
  assert.ok(start >= 0 && contentStyleStart > start);
  for (const contract of [/alwaysBounceVertical=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(owner, contract);
  assert.match(owner, /initialNumToRender=\{Math\.max\(results\.length,1\)\}/);
  assert.match(owner, /maxToRenderPerBatch=\{Math\.max\(results\.length,CAR_RESULT_RENDER_BATCH_SIZE\)\}/);
  assert.match(owner, /windowSize=\{CAR_RESULT_WINDOW_SIZE\}/);
  assert.match(owner, /onScroll=\{handleCarScroll\} scrollEventThrottle=\{16\}/);
  assert.match(owner, /onScrollBeginDrag=\{\(\)=>\{carBackToTopReturningRef\.current=false;\}\}/);
  assert.match(owner, /onMomentumScrollEnd=\{\(event\)=>\{carBackToTopReturningRef\.current=false;handleCarScroll\(event\);\}\}/);
  assert.match(owner, /contentContainerStyle=\{\[r\.body,\{paddingBottom:Math\.max\(insets\.bottom \+ 64,64\)\}\]\}/);
  assert.match(cars, /edges=\{\["top"\]\}/);
  const horizontal = cars.match(/<ScrollView horizontal[^>]*>/)?.[0];
  assert.ok(horizontal);
  for (const contract of [/alwaysBounceHorizontal=\{false\}/, /bounces=\{false\}/, /overScrollMode="never"/]) assert.match(horizontal, contract);
  assert.doesNotMatch(horizontal, /carScrollRef|alwaysBounceVertical/);
  assert.doesNotMatch(cars, /body:\{[^}]*paddingBottom/);
});

test("Cars keeps result content behavior without pagination", () => {
  assert.match(cars, /data=\{listData\}/);
  assert.match(cars, /renderItem=\{\(\{item,index\}\)=>/);
  assert.match(cars, /carResultCountLabel\(filtered\.length\)/);
  assert.doesNotMatch(cars, /Page \{page\}|label="Previous"|label="Next"|pageSize|totalPages/);
});
