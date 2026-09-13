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
  assert.match(
    resultsScreen,
    /const resolved=resolveCarResultImageSource\(value\)/,
  );
  assert.match(resultsScreen, /new URL\(resolved,`\$\{base\.baseUrl\}\/`\)/);
});
