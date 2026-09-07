import assert from "node:assert/strict";
import test from "node:test";
import {
  birthDateOptions,
  dateDraftFromValue,
  dateDraftValue,
  joinProfileName,
  normalizeBirthDate,
  splitProfileName,
  wheelIndex,
} from "./personalDetailsEditorModel";

const latest = "2008-09-07";
test("legacy names retain all words and separate fields preserve internal spaces", () => {
  assert.deepEqual(splitProfileName(" Alex de la Cruz "), {
    firstName: "Alex",
    lastName: "de la Cruz",
  });
  assert.equal(
    joinProfileName({ firstName: " Mary Jane ", lastName: " van der Berg " }),
    "Mary Jane van der Berg",
  );
  assert.deepEqual(splitProfileName("Cher"), {
    firstName: "Cher",
    lastName: "",
  });
  assert.equal(joinProfileName(splitProfileName(null)), "");
});
test("empty DOB starts at the latest eligible date, with an explicit Save", () => {
  assert.equal(
    dateDraftValue(normalizeBirthDate(dateDraftFromValue(), latest)),
    latest,
  );
});
test("month and year changes clamp invalid days without rolling dates forward", () => {
  for (const [input, expected] of [
    ["2000-02-31", "2000-02-29"],
    ["2001-02-29", "2001-02-28"],
    ["1900-02-29", "1900-02-28"],
    ["1999-04-31", "1999-04-30"],
    ["2008-12-31", latest],
  ]) {
    assert.equal(
      dateDraftValue(normalizeBirthDate(dateDraftFromValue(input), latest)),
      expected,
    );
  }
});
test("wheels expose calendar days and constrain months/days only at the age boundary", () => {
  assert.deepEqual(birthDateOptions(dateDraftFromValue(latest), latest), {
    monthCount: 9,
    dayCount: 7,
    latestYear: 2008,
  });
  assert.equal(
    birthDateOptions(dateDraftFromValue("2008-08-31"), latest).dayCount,
    31,
  );
  assert.equal(
    birthDateOptions(dateDraftFromValue("2000-02-29"), latest).dayCount,
    29,
  );
  assert.equal(
    birthDateOptions(dateDraftFromValue("2001-02-28"), latest).dayCount,
    28,
  );
});
test("every available year/month normalizes to a real eligible date", () => {
  for (let year = 1884; year <= 2008; year++) {
    for (let month = 1; month <= 12; month++) {
      const value = dateDraftValue(
        normalizeBirthDate(
          { year: String(year), month: String(month), day: "31" },
          latest,
        ),
      );
      assert.equal(
        new Date(value + "T00:00:00Z").toISOString().slice(0, 10),
        value,
      );
      assert.ok(value <= latest);
    }
  }
});
test("wheel offsets snap to the nearest available item, including over-scroll boundaries", () => {
  assert.equal(wheelIndex(0, 56, 12), 0);
  assert.equal(wheelIndex(27, 56, 12), 0);
  assert.equal(wheelIndex(29, 56, 12), 1);
  assert.equal(wheelIndex(-100, 56, 12), 0);
  assert.equal(wheelIndex(9999, 56, 12), 11);
});
