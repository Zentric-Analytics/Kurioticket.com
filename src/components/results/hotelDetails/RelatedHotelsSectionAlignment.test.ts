import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);

test("related Hotel card keeps View hotel next to its arrow", () => {
  assert.match(
    source,
    /items-center justify-end gap-1\.5[\s\S]*\{labels\.viewHotel\}[\s\S]*<ArrowRight className="h-4 w-4 shrink-0"/,
  );
  assert.doesNotMatch(
    source,
    /items-center justify-between[\s\S]*\{labels\.viewHotel\}[\s\S]*<ArrowRight/,
  );
});
