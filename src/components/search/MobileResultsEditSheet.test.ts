import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./MobileResultsEditSheet.tsx", import.meta.url),
  "utf8",
);

test("mobile Results editor is an accessible rounded bottom sheet", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /createPortal\([\s\S]*?document\.body/);
  assert.match(source, /data-mobile-results-overlay-root/);
  assert.match(source, /mobile-results-overlay-root/);
  assert.match(source, /fixed inset-0/);
  assert.doesNotMatch(source, /h-\[100dvh\]/);
  assert.doesNotMatch(source, /min-h-\[100svh\]/);
  assert.match(source, /w-screen/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /rounded-t-\[22px\]/);
  assert.match(source, /max-h-\[94dvh\]/);
  assert.match(source, /bg-slate-950\/35/);
  assert.match(source, /mobile-results-sheet-content[\s\S]*?bg-inherit/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /bottomSurfaceContinuation\?: boolean/);
  assert.match(source, /bottomSurfaceContinuationClassName\?: string/);
  assert.match(source, /data-mobile-results-sheet-bottom-continuation/);
  assert.match(source, /mobile-results-sheet-bottom-continuation/);
  assert.match(
    source,
    /mobile-results-sheet-bottom-continuation[\s\S]*?bg-white[\s\S]*?bottomSurfaceContinuationClassName/,
  );
});

test("sheet owns internal focus but leaves launcher restoration to Results", () => {
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /nestedLayerOpen/);
  assert.doesNotMatch(source, /launcherRef/);
  assert.doesNotMatch(source, /launcher\?\.focus/);
  assert.match(source, /acquireMobileResultsScrollLock\(\)/);
  assert.match(source, /browserCanvasColor\?: string/);
  assert.match(source, /blendHeaderBackdrop\?: boolean/);
  assert.match(
    source,
    /blendHeaderBackdrop && "mobile-results-sheet-backdrop-blend-header"/,
  );
  assert.match(source, /fixed inset-x-0 top-\[calc\(100dvh-1px\)\] z-20 bg-white/);
  assert.doesNotMatch(source, /top-\[calc\(100%-1px\)\]/);
  assert.match(
    source,
    /acquireMobileResultsOverlayCanvas\(\{\s*canvasColor: browserCanvasColor,\s*\}\)/,
  );
  assert.match(source, /\[browserCanvasColor, open\]/);
  assert.doesNotMatch(source, /style\.position/);
  assert.doesNotMatch(source, /window\.scrollTo/);
  assert.match(source, /motion-reduce:transition-none/);
});
