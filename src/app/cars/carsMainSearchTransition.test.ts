import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const pendingStart = source.indexOf(
  "\n  if (isSubmitting) {\n    return (",
  source.indexOf("const handleSubmit"),
);
const submitHandler = source.slice(
  source.indexOf("const handleSubmit"),
  pendingStart,
);
const pendingBranch = source.slice(
  pendingStart,
  source.indexOf("\n  return (", pendingStart + 1),
);

test("valid Cars main Search secures its href before immediate navigation pending", () => {
  const validationIndex = submitHandler.indexOf("validateCarsForm");
  const invalidReturnIndex = submitHandler.indexOf(
    "if (Object.values(nextErrors).some(Boolean))",
  );
  const hrefIndex = submitHandler.indexOf(
    "const href = `/cars/results?${params.toString()}`",
  );
  const pendingIndex = submitHandler.indexOf("setIsSubmitting(true)");
  const navigationIndex = submitHandler.indexOf("router.push(href)");

  assert.ok(validationIndex >= 0);
  assert.ok(validationIndex < invalidReturnIndex);
  assert.ok(invalidReturnIndex < hrefIndex);
  assert.ok(hrefIndex < pendingIndex);
  assert.ok(pendingIndex < navigationIndex);
  assert.match(submitHandler, /if \(isSubmitting\) \{\s*return;/);
});

test("Cars main pending replaces the homepage with the shared localized Results loader", () => {
  assert.match(source, /import \{ BrandedLoading \}/);
  assert.match(pendingBranch, /<AppHeader/);
  assert.match(pendingBranch, /flushDesktopBottom/);
  assert.match(pendingBranch, /flushMobileBottom/);
  assert.match(pendingBranch, /hideDesktopTravelNav/);
  assert.match(pendingBranch, /hideMobileCategoryTabs/);
  assert.doesNotMatch(pendingBranch, /mobileHeroOverlay/);
  assert.match(pendingBranch, /<BrandedLoading/);
  assert.doesNotMatch(pendingBranch, /<Footer|carsHeroImage|searchingCars/);

  for (const key of [
    "carsResults.loading.title",
    "carsResults.loading.checkingCarsAndRates",
    "carsResults.loading.comparingVehiclesAndProviders",
    "carsResults.loading.findingBestAvailableOptions",
    "carsResults.loading.preparingResults",
  ]) {
    assert.match(pendingBranch, new RegExp(key.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(
    submitHandler + pendingBranch,
    /setTimeout|sleep|delay\(/,
  );
});

test("invalid Cars main Search returns before pending and navigation", () => {
  assert.match(
    submitHandler,
    /if \(Object\.values\(nextErrors\)\.some\(Boolean\)\) \{\s*return;\s*\}/,
  );
  assert.ok(
    submitHandler.indexOf("setIsSubmitting(true)") >
      submitHandler.indexOf("Object.values(nextErrors)"),
  );
  assert.ok(
    submitHandler.indexOf("router.push(href)") >
      submitHandler.indexOf("Object.values(nextErrors)"),
  );
});
