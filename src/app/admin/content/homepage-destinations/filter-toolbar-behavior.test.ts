import assert from "node:assert/strict";
import test from "node:test";

import {
  hasActiveHomepageDestinationFilters,
  submitHomepageDestinationFilters,
} from "./filter-toolbar-behavior";

for (const control of ["Market", "assignment type"]) {
  test(`changing ${control} requests submission of its existing form`, () => {
    let submissions = 0;
    const form = { requestSubmit: () => { submissions += 1; } };
    const event = { currentTarget: { form } } as Parameters<typeof submitHomepageDestinationFilters>[0];

    submitHomepageDestinationFilters(event);

    assert.equal(submissions, 1);
  });
}

test("a detached dropdown does not attempt navigation or submission", () => {
  const event = { currentTarget: { form: null } } as Parameters<typeof submitHomepageDestinationFilters>[0];
  assert.doesNotThrow(() => submitHomepageDestinationFilters(event));
});

test("Clear filters visibility follows each supported active filter", () => {
  assert.equal(hasActiveHomepageDestinationFilters("", "ALL", "ALL"), false);
  assert.equal(hasActiveHomepageDestinationFilters("LHR", "ALL", "ALL"), true);
  assert.equal(hasActiveHomepageDestinationFilters("", "EUROPE", "ALL"), true);
  assert.equal(hasActiveHomepageDestinationFilters("", "ALL", "REGIONAL_ALIAS"), true);
});
