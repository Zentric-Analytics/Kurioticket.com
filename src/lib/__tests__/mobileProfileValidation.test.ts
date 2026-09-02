import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidPersonalDetailsDateOfBirth,
  validateMobilePersonalDetailsChange,
} from "@/lib/mobileProfileValidation";

test("date of birth accepts canonical real dates for users who are at least 18", () => {
  const referenceDate = new Date("2026-09-02T12:00:00Z");
  assert.equal(isValidPersonalDetailsDateOfBirth("2008-09-02", referenceDate), true);
  assert.equal(isValidPersonalDetailsDateOfBirth("2000-02-29", referenceDate), true);
});

test("date of birth rejects malformed, impossible, future, and under-18 dates", () => {
  const referenceDate = new Date("2026-09-02T12:00:00Z");
  assert.equal(isValidPersonalDetailsDateOfBirth("2000-2-29", referenceDate), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2025-02-29", referenceDate), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2999-01-01", referenceDate), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2008-09-03", referenceDate), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2009-09-02", referenceDate), false);
});

test("mobile personal details accepts supported gender and nationality values", () => {
  assert.equal(
    validateMobilePersonalDetailsChange({
      next: {
        dateOfBirth: "2000-02-29",
        gender: "Female",
        nationality: "Nigeria",
      },
      previous: null,
    }),
    true,
  );
});

test("mobile personal details rejects new unsupported gender and nationality values", () => {
  assert.equal(
    validateMobilePersonalDetailsChange({
      next: { gender: "Something else" },
      previous: { gender: "Male" },
    }),
    false,
  );
  assert.equal(
    validateMobilePersonalDetailsChange({
      next: { nationality: "Atlantis" },
      previous: { nationality: "Nigeria" },
    }),
    false,
  );
});

test("unchanged legacy values do not block unrelated profile saves", () => {
  assert.equal(
    validateMobilePersonalDetailsChange({
      next: {
        dateOfBirth: "legacy-date",
        gender: "Legacy value",
        nationality: "Legacy nationality",
      },
      previous: {
        dateOfBirth: "legacy-date",
        gender: "Legacy value",
        nationality: "Legacy nationality",
      },
    }),
    true,
  );
});

test("clearing personal detail fields remains allowed", () => {
  assert.equal(
    validateMobilePersonalDetailsChange({
      next: { dateOfBirth: null, gender: null, nationality: null },
      previous: {
        dateOfBirth: "2000-01-01",
        gender: "Male",
        nationality: "Nigeria",
      },
    }),
    true,
  );
});
