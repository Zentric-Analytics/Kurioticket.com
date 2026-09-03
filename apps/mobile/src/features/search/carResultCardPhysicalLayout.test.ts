import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/CarResultCard.tsx"), "utf8");
const styles = source.slice(source.indexOf("const c = StyleSheet.create"));

test("compact Car result media cannot create a percentage-height layout loop", () => {
  assert.doesNotMatch(styles, /height:\s*"(?:100|68)%"/);
  assert.match(styles, /visual:\{width:"38%",minHeight:250/);
  assert.match(styles, /visualCompact:\{width:"36%",minHeight:294\}/);
  assert.match(styles, /image:\{width:"100%",minHeight:250,flex:1\}/);
});

test("a failed Car image reveals the truthful unavailable state", () => {
  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => setImageFailed\(false\), \[imageUri\]\)/);
  assert.match(source, /imageUri && !imageFailed/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, />Vehicle image unavailable<\/Text>/);
});
