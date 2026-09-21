import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const resultsScreen = readFileSync(resolve("src/features/search/ApprovedCarResultsScreen.tsx"), "utf8");

test("native Cars results contain curated catalogue assets without changing external supplier fit", () => {
  assert.match(
    source,
    /import \{ isCuratedCarResultImage \} from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\/lib\/cars\/carResultImage"/,
  );
  assert.match(
    source,
    /const curatedImage = isCuratedCarResultImage\(imageUri\)/,
  );
  assert.match(source, /const imageResizeMode = curatedImage \? "contain" : "cover"/);
  assert.match(source, /resizeMode=\{imageResizeMode\}/);
  assert.match(source, /style=\{\[c\.image,curatedImage&&c\.curatedImage\]\}/);
  assert.match(source, /curatedImage:\{transform:\[\{scale:1\.08\}\]\}/);
  assert.doesNotMatch(
    source,
    /<Image source=\{\{ uri: imageUri \}\} resizeMode="cover"/,
  );
});

test("native Cars results version curated URLs before resolving the API origin", () => {
  assert.match(resultsScreen, /const resolveNativeCarImageUri=.*?resolveCarResultImageSource\(value\)/);
  assert.match(resultsScreen, /new URL\(resolved,`\$\{base\.baseUrl\}\/`\)/);
});

test("native Cars prewarm artwork separately from the full initial row extent", () => {
  assert.match(resultsScreen, /const CAR_RESULT_INITIAL_IMAGE_COUNT = 3/);
  assert.match(resultsScreen, /prefetchInitialCarImages\(acceptance\.accepted\)/);
  assert.match(resultsScreen, /Image\.prefetch\(uri\)/);
  assert.match(resultsScreen, /KURIOTICKET_COMPARE_LOGO_URI/);
  assert.match(resultsScreen, /<FlatList ref=\{carScrollRef\}/);
  assert.match(resultsScreen, /initialNumToRender=\{Math\.max\(results\.length,1\)\}/);
  assert.match(resultsScreen, /maxToRenderPerBatch=\{Math\.max\(results\.length,CAR_RESULT_RENDER_BATCH_SIZE\)\}/);
  assert.match(resultsScreen, /windowSize=\{CAR_RESULT_WINDOW_SIZE\}/);
});

test("native Cars pass the already-versioned artwork URL into Details for the same cache key", () => {
  assert.match(
    resultsScreen,
    /result:JSON\.stringify\(\{\.\.\.result,imageUrl:resolveNativeCarImageUri\(result\.imageUrl\)\?\?result\.imageUrl\}\)/,
  );
});
