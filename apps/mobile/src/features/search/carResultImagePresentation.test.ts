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
    /const imageResizeMode = isCuratedCarResultImage\(imageUri\) \? "contain" : "cover"/,
  );
  assert.match(source, /resizeMode=\{imageResizeMode\}/);
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
