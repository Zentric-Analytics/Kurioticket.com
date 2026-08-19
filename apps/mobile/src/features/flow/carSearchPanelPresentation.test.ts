import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const icons = readFileSync("src/features/flow/FlowIcon.tsx", "utf8");
const pairedRows = [...panel.matchAll(/<View style=\{styles\.pairedRow\}>([\s\S]*?)<\/View>/g)].map((match) => match[1]);

test("Cars pairs pick-up and drop-off dates before paired pick-up and drop-off times", () => {
  assert.equal(pairedRows.length, 2);
  assert.match(pairedRows[0], /label="Pick-up date"[\s\S]*label="Drop-off date"/);
  assert.doesNotMatch(pairedRows[0], /label="(?:Pick-up|Drop-off) time"/);
  assert.match(pairedRows[1], /label="Pick-up time"[\s\S]*label="Drop-off time"/);
  assert.doesNotMatch(pairedRows[1], /label="(?:Pick-up|Drop-off) date"/);

  const order = ["Pick-up location", "Return to a different location", "Drop-off location", "Pick-up date", "Drop-off date", "Pick-up time", "Drop-off time", "Driver age", "PrimaryButton"];
  let cursor = -1;
  for (const marker of order) {
    const next = panel.indexOf(marker, cursor + 1);
    assert.ok(next > cursor, `${marker} must follow the preceding form control`);
    cursor = next;
  }
});

test("Cars fields use the native calendar, clock, person, and themed chevron icons", () => {
  assert.match(pairedRows[0], /label="Pick-up date"[\s\S]*?icon="calendar"/);
  assert.match(pairedRows[0], /label="Drop-off date"[\s\S]*?icon="calendar"/);
  assert.match(pairedRows[1], /label="Pick-up time"[\s\S]*?icon="clock"/);
  assert.match(pairedRows[1], /label="Drop-off time"[\s\S]*?icon="clock"/);
  assert.match(panel, /label="Driver age"[\s\S]*?icon="person"[\s\S]*?name="chevron" color=\{ft\.colors\.icon\}/);
});

test("Cars paired controls stay in equal non-wrapping columns at narrow widths", () => {
  assert.match(panel, /pairedRow:\{flexDirection:"row"\}/);
  assert.match(panel, /pairedHalf:\{flex:1,minWidth:0\}/);
  assert.doesNotMatch(panel, /pairedRow:\{[^}]*flexWrap/);
});

test("FlowIcon owns a stroke-based clock glyph", () => {
  assert.match(icons, /\| "clock" \| "close"/);
  assert.match(icons, /clock: <><Circle \{\.\.\.line\}[\s\S]*?<Path \{\.\.\.line\}/);
});
