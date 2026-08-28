import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resetFlow = readFileSync("src/features/profile/PasswordResetFlow.tsx", "utf8");

test("password reset protects reopened flows from stale in-flight requests", () => {
  assert.match(resetFlow, /const activeRef = useRef\(active\)/);
  assert.match(resetFlow, /const generationRef = useRef\(0\)/);
  assert.match(resetFlow, /const inFlightRef = useRef\(false\)/);
  assert.match(resetFlow, /if \(inFlightRef\.current\) return/g);
  assert.match(resetFlow, /generation !== generationRef\.current/g);
  assert.match(resetFlow, /!activeRef\.current/g);
  const inactiveReset = resetFlow.slice(resetFlow.indexOf("useEffect(() =>"), resetFlow.indexOf("const sendCode = async"));
  assert.doesNotMatch(inactiveReset, /setSubmitting\(false\)/);
});

test("password reset navigation copy explicitly covers every supported locale", async () => {
  const { mobileLocaleCodes } = await import("../../localization/mobileLocalizationCatalog");
  for (const locale of mobileLocaleCodes) {
    const key = /^[a-z]+$/.test(locale) ? `${locale}:` : `\"${locale}\":`;
    assert.ok(resetFlow.includes(key), `missing reset navigation copy for ${locale}`);
  }
  assert.match(resetFlow, /const resetNavigationCopy: Record<MobileLocale, ResetNavigationCopy>/);
  assert.doesNotMatch(resetFlow, /if \(locale === \"es-es\"\)/);
});
