import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./mobilePickerKeyboardFocus.ts", import.meta.url), "utf8");

test("synchronously commits the picker before focusing its input", () => {
  assert.match(source, /import \{ flushSync \} from "react-dom"/);
  const commit = source.indexOf("flushSync(openPicker)");
  const lookup = source.indexOf("document.getElementById(inputId)");
  const focus = source.indexOf("input.focus({ preventScroll: true })");
  assert.ok(commit >= 0 && lookup > commit && focus > lookup);
  assert.match(source, /input instanceof HTMLInputElement/);
  assert.doesNotMatch(source, /setTimeout|requestAnimationFrame/);
});

test("retains an SSR-safe open path and tolerates a missing target", () => {
  assert.match(source, /typeof document === "undefined"/);
  assert.match(source, /openPicker\(\);\s*return;/);
  assert.doesNotMatch(source, /throw new/);
});
