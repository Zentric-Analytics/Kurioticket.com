import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidPersonalDetailsDateOfBirth,
  validateMobilePersonalDetailsChange,
} from "@/lib/mobileProfileValidation";

test("date of birth accepts canonical real past dates", () => {
  assert.equal(isValidPersonalDetailsDateOfBirth("2000-02-29"), true);
  assert.equal(isValidPersonalDetailsDateOfBirth("1990-12-31"), true);
});

test("date of birth rejects malformed, impossible, and future dates", () => {
  assert.equal(isValidPersonalDetailsDateOfBirth("2000-2-29"), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2025-02-29"), false);
  assert.equal(isValidPersonalDetailsDateOfBirth("2999-01-01"), false);
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
