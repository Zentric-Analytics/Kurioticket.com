import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync(
  new URL("./DesktopHotelStayEditor.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("./DesktopHotelStayEditor.module.css", import.meta.url),
  "utf8",
);

test("Hotel Details calendar uses Results-style two-month selection behavior", () => {
  assert.match(details, /preferredWidth=\{570\}/);
  assert.match(details, /desiredHeight=\{420\}/);
  assert.match(details, /if \(!start \|\| \(start && end\)\)/);
  assert.match(details, /if \(selectedIso <= start\)/);
  assert.match(details, /onChange\(start, selectedIso\)/);
  assert.doesNotMatch(details, /advanceToGuests|onComplete=|setFocusedDate|requestAnimationFrame\(\(\) => calendarRef/);
});

test("Hotel Details calendar keeps Clear and Done controls instead of auto-closing after checkout", () => {
  assert.match(details, />\s*Clear\s*</);
  assert.match(details, />\s*Done\s*</);
  assert.match(details, /onClick=\{\(\) => onChange\("", ""\)\}/);
  assert.match(details, /onClick=\{onClose\}/);
});

test("Hotel Details calendar matches Results compact visual geometry", () => {
  assert.match(styles, /\.calendar \{ padding: 12px; \}/);
  assert.match(styles, /\.calendarMonths[\s\S]*gap: 12px/);
  assert.match(styles, /width: 32px; height: 32px/);
  assert.match(styles, /border-radius: 999px/);
  assert.match(styles, /data-in-range="true"/);
  assert.match(styles, /background: #004bb8/);
});
