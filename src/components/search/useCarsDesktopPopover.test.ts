import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./useCarsDesktopPopover.ts", import.meta.url),
  "utf8",
);

test("above Cars popovers translate their rendered height above the launcher edge", () => {
  assert.match(
    source,
    /transform:\s*geometry\.placement === "above"\s*\? "translateY\(-100%\)"\s*:\s*undefined/,
  );
});

test("scroll positioning closes a popover after its launcher leaves the viewport", () => {
  assert.match(source, /window\.addEventListener\("scroll", update, true\)/);
  assert.match(source, /launcherIsOutsideViewport/);
  assert.match(source, /onLauncherOutOfViewRef\.current\?\.\(\)/);
});
