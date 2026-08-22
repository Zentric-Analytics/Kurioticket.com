import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const primitives = readFileSync("src/features/flow/FlowPrimitives.tsx", "utf8");
const start = primitives.indexOf("export function CompactSearchField");
const compact = primitives.slice(start, primitives.indexOf("export function ChoiceSheet", start));

test("compact fields put their uppercase label above an icon, flexible text column, and trailing content", () => {
  assert.match(compact, /\{label\.toUpperCase\(\)\}/);
  assert.match(compact, /compactLabel[\s\S]*compactValueRow/);
  assert.match(compact, /<FlowIcon name=\{icon\} size=\{18\}[\s\S]*compactTextColumn[\s\S]*\{value\}[\s\S]*\{meta \?[\s\S]*\{trailing \?\? <FlowIcon name="chevron" size=\{16\}/);
  assert.match(primitives, /compactTextColumn: \{ flex: 1, minWidth: 0 \}/);
});

test("compact fields use semantic colors, muted values, and shared pressed feedback", () => {
  assert.match(compact, /backgroundColor: ft\.colors\.input/);
  assert.match(compact, /borderBottomColor: ft\.colors\.border/);
  assert.match(compact, /ft\.colors\.secondaryText/);
  assert.match(compact, /muted \? ft\.colors\.placeholder : ft\.colors\.text/);
  assert.match(compact, /ft\.colors\.icon/);
  assert.match(compact, /pressed && ft\.styles\.pressed/);
});
