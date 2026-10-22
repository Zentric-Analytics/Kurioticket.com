import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./SearchTabs.tsx", import.meta.url), "utf8");

function flightTypographyClasses() {
  const start = source.indexOf("const flightFieldLabelClassName");
  const end = source.indexOf("const hotelFieldLabelClassName", start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test("desktop Flight fields use a clear, moderate value hierarchy", () => {
  const classes = flightTypographyClasses();

  assert.match(
    classes,
    /lg:text-\[10px\] lg:font-medium lg:leading-4 lg:tracking-\[0\.10em\]/,
  );
  assert.equal(
    classes.match(
      /lg:text-\[16px\] lg:font-medium lg:leading-5 lg:tracking-normal/g,
    )?.length,
    2,
  );
  assert.doesNotMatch(classes, /lg:text-\[15px\]|lg:tracking-\[-0\.01em\]/);
});

test("desktop Flight search action follows the mobile-web emphasis without changing its base rule", () => {
  const start = source.indexOf("const submitButtonClassName");
  const end = source.indexOf("const hotelSubmitWrapClassName", start);
  const submit = source.slice(start, end);

  assert.match(submit, /text-sm font-bold/);
  assert.match(submit, /lg:text-\[16px\] lg:font-semibold lg:leading-5/);
  assert.doesNotMatch(submit, /lg:text-\[15px\]/);
});
