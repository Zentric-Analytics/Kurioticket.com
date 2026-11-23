import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarsResultsClient.tsx", import.meta.url),
  "utf8",
);

test("standalone Cars Back-to-top keeps Hotels behavior with a Cars-specific balanced surface", () => {
  assert.equal(source.match(/aria-label="Back to top"/g)?.length, 1);
  assert.match(source, /CAR_BACK_TO_TOP_SCROLL_THRESHOLD = 600/);
  assert.match(
    source,
    /setShowBackToTop\(window\.scrollY > CAR_BACK_TO_TOP_SCROLL_THRESHOLD\)/,
  );
  assert.match(
    source,
    /window\.addEventListener\("scroll", update, \{ passive: true \}\)/,
  );
  assert.match(source, /window\.addEventListener\("resize", update\)/);
  assert.match(source, /\{!guidedPlanning \? \(/);
  assert.match(
    source,
    /behavior: prefersReducedResultsMotion\(\) \? "auto" : "smooth"/,
  );
  assert.match(source, /fixed right-4 z-\[800\] flex h-11 w-11/);
  assert.match(source, /rounded-xl/);
  assert.match(source, /bg-\[#EEF2F6\]/);
  assert.match(source, /shadow-md transition-all/);
  assert.match(
    source,
    /bottom-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/,
  );
  assert.match(source, /sm:bottom-6 sm:right-6/);
  assert.match(
    source,
    /showBackToTop[\s\S]*?"translate-y-0 opacity-100"[\s\S]*?"pointer-events-none translate-y-2 opacity-0"/,
  );
  assert.match(
    source,
    /<ArrowUp className="h-\[18px\] w-\[18px\]" aria-hidden="true"/,
  );

  const backToTopStart = source.indexOf('aria-label="Back to top"');
  const backToTopEnd = source.indexOf("</button>", backToTopStart);
  const backToTop = source.slice(backToTopStart, backToTopEnd);
  assert.match(backToTop, /bg-\[#EEF2F6\]/);
  assert.doesNotMatch(backToTop, /bg-white/);
  assert.doesNotMatch(backToTop, /rounded-full|shadow-lg|end-4 z-40|h-5 w-5/);
  assert.doesNotMatch(
    backToTop,
    /bottom-\[calc\((?:3|5|6)rem\+env\(safe-area-inset-bottom\)\)\]/,
  );
  assert.doesNotMatch(
    backToTop,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/,
  );
});
