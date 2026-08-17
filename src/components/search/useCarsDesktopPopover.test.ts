import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateDesktopPopoverGeometry } from "./desktopPopoverPosition";

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

test("placement uses configured height instead of temporary rendered content height", () => {
  assert.match(
    source,
    /const placementHeight = Math\.min\(desiredHeight, maxHeight \?\? desiredHeight\)/,
  );
  assert.match(source, /desiredHeight: placementHeight/);
  assert.doesNotMatch(
    source,
    /popoverRef\.current\?\.getBoundingClientRect\(\)\.height/,
  );

  const launcher = {
    left: 100,
    right: 300,
    top: 500,
    bottom: 560,
    width: 200,
    height: 60,
  };
  const geometry = calculateDesktopPopoverGeometry({
    fieldRect: launcher,
    boundaryRect: launcher,
    viewportWidth: 1366,
    viewportHeight: 650,
    viewportPadding: 16,
    gap: 10,
    preferredWidth: 420,
    desiredHeight: 320,
  });

  assert.equal(geometry.placement, "above");
  assert.equal(geometry.top, launcher.top - 10);
});

test("async result growth cannot feed rendered height back into placement", () => {
  assert.doesNotMatch(source, /renderedHeight/);
  assert.match(source, /observer\.observe\(popoverRef\.current\)/);
  assert.match(source, /maxHeight: Math\.min\(geometry\.maxHeight, maxHeight \?\? geometry\.maxHeight\)/);
});
