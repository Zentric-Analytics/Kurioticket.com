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
