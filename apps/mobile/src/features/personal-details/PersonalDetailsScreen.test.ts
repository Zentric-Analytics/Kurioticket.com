import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);
test("screen opens read-only and Edit switches the same card to editing", () => {
  assert.match(screen, /!editing\s*\?\s*\(/);
  assert.match(screen, /setEditing\(true\)/);
});
test("missing values use localized fallback", () =>
  assert.match(screen, /values\[index\]\s*\|\|\s*c\.missing/));
test("Cancel restores authoritative saved values", () => {
  assert.match(screen, /setDraft\(saved\s*\|\|\s*\{\}\)/);
  assert.match(screen, /setEditing\(false\)/);
});
test("Save is disabled until dirty and while saving", () =>
  assert.match(screen, /disabled=\{!dirty\s*\|\|\s*saving\}/));
test("duplicate submission is prevented and failed save retains draft", () => {
  assert.match(screen, /submitting\.current/);
  assert.doesNotMatch(screen, /catch\{[^}]*setDraft/s);
});
test("success returns to read-only and refreshes stored session identity", () => {
  assert.match(screen, /setEditing\(false\)/);
  assert.match(screen, /updateStoredSessionName/);
});
test("email is read-only and external handoff is accessible", () => {
  assert.match(screen, /editable=\{false\}/);
  assert.match(screen, /accessibilityHint=\{c\.externalHint\}/);
});
test("authentication expiry preserves protected return intent", () =>
  assert.match(screen, /returnTo:\s*"\/personal-information"/));
test("theme semantics cover shell card inputs and selectors", () => {
  for (const token of [
    "theme.background",
    "theme.surface",
    "theme.border",
    "theme.text",
    "theme.muted",
  ])
    assert.ok(screen.includes(token));
});
test("no avatar identity hero or introductory card is introduced", () => {
  assert.doesNotMatch(screen, /Avatar|initials|identityHero|welcomeCard/);
});
test("screen has loading retry feedback and discard confirmation", () => {
  assert.match(screen, /c\.loading/);
  assert.match(screen, /c\.retry/);
  assert.match(screen, /Alert\.alert\(c\.discardTitle/);
});
test("read-only and edit content have no outer card treatment", () => {
  assert.doesNotMatch(screen, /\bs\.card\b|\bcard:\s*\{|formCard/);
  assert.doesNotMatch(
    screen,
    /backgroundColor:theme\.surface,borderColor:theme\.border/,
  );
  assert.match(screen, /<View>\s*<Text style=\{\[s\.description/);
  assert.match(screen, /<View style=\{s\.formContent\}>/);
});
test("country and nationality search selectors wait for an explicit search-field tap", () => {
  assert.doesNotMatch(
    screen,
    /<TextInput autoFocus accessibilityLabel=\{c\.searchCountry\}/,
  );
  assert.doesNotMatch(screen, /autoFocus/);
  assert.match(screen, /if \(visible\) Keyboard\.dismiss\(\)/);
});
test("selector query is session-scoped and reset on lifecycle boundaries", () => {
  assert.match(screen, /const \[q, setQ\] = useState\(""\)/);
  assert.match(
    screen,
    /useEffect\([\s\S]*?setQ\(""\)[\s\S]*?\[selectorType, visible\]\)/,
  );
  assert.match(
    screen,
    /const close = \(\) => \{[\s\S]*?Keyboard\.dismiss\(\);[\s\S]*?setQ\(""\)/,
  );
  assert.match(screen, /onSelect\(item\.value\);\s*setQ\(""\);\s*onClose\(\)/);
  assert.match(screen, /selectorType=\{selector\}/);
});
test("phone, nationality, and address searches have independent aliases", () => {
  assert.match(
    screen,
    /PHONE_COUNTRY_OPTIONS\.map[\s\S]*?x\.isoCode[\s\S]*?x\.dialCode[\s\S]*?replace\("\+", ""\)/,
  );
  assert.match(screen, /addressCountry"[\s\S]*?searchTerms: \[x\.code\]/);
  assert.match(
    screen,
    /NATIONALITY_OPTIONS\.map[\s\S]*?searchTerms: \[COUNTRY_OPTIONS\[index\]\.code\]/,
  );
});
test("selector modal is keyboard-aware and only results scroll", () => {
  assert.match(
    screen,
    /<KeyboardAvoidingView\s*behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/,
  );
  const selector = screen.slice(
    screen.indexOf("function Selector("),
    screen.indexOf("function Field("),
  );
  assert.ok(selector.indexOf("{title}") < selector.indexOf("<ScrollView"));
  assert.ok(selector.indexOf("<TextInput") < selector.indexOf("<ScrollView"));
  assert.match(selector, /maxHeight: height \* 0\.82/);
  assert.match(selector, /keyboardShouldPersistTaps="handled"/);
});
test("all selector dismissal paths dismiss the keyboard", () => {
  const selector = screen.slice(
    screen.indexOf("function Selector("),
    screen.indexOf("function Field("),
  );
  assert.match(selector, /onRequestClose=\{close\}/);
  assert.match(selector, /onPress=\{close\}/);
  assert.match(
    selector,
    /onPress=\{\(\) => \{\s*Keyboard\.dismiss\(\);\s*onSelect/,
  );
  assert.ok((selector.match(/onPress=\{close\}/g) ?? []).length >= 2);
});
test("opening Address does not programmatically focus its fields", () => {
  const addressSection = screen.slice(
    screen.indexOf("{c.addressSection}"),
    screen.indexOf("<View style={s.actions}>"),
  );
  assert.ok(addressSection.length > 0);
  assert.doesNotMatch(addressSection, /autoFocus|\.focus\(/);
  assert.match(addressSection, /<Field[\s\S]*?label=\{c\.street\}/);
});
test("edit controls follow the web responsive alignment contract", () => {
  assert.match(screen, /testID="personal-details-phone-row"/);
  assert.match(screen, /countrySegment:\s*\{\s*width:\s*82/);
  assert.match(screen, /phoneInput:\s*\{[\s\S]*?flex:\s*1/);
  assert.match(
    screen,
    /dayControl:\s*\{\s*flex:\s*3[\s\S]*monthControl:\s*\{\s*flex:\s*6[\s\S]*yearControl:\s*\{\s*flex:\s*4/,
  );
  assert.match(screen, /localityRow:[\s\S]*flexDirection:\s*"row"/);
  assert.match(screen, /width\s*<\s*340\s*&&\s*s\.localityStack/);
  assert.match(screen, /postalField:\s*\{\s*width:\s*"50%"/);
  assert.match(screen, /actions:[\s\S]*justifyContent:\s*"flex-end"/);
});
test("dynamic flag is decorative, validated and has a safe ISO fallback", () => {
  assert.match(screen, /getCountryFlagUri\(option\?\.isoCode\)/);
  assert.match(screen, /<Image[\s\S]*?accessible=\{false\}/);
  assert.match(screen, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(screen, /option\?\.isoCode\s*\|\|\s*"--"/);
});
test("phone country changes preserve the local-number draft", () => {
  assert.match(
    screen,
    /selector === "phone"[\s\S]*?patch\("phoneCountryCode", value\)/,
  );
  const selection = screen.slice(
    screen.indexOf("onSelect={(value)"),
    screen.indexOf("function Field"),
  );
  assert.doesNotMatch(
    selection,
    /selector === "phone"[^{;]*patch\("phoneNumber"/,
  );
});
test("address fields retain web order and canonical serializer", () => {
  const address = screen.slice(
    screen.indexOf("{c.addressSection}"),
    screen.indexOf("s.actionDivider"),
  );
  for (const key of [
    "addressLine1",
    "apartmentOrSuite",
    "city",
    "stateOrRegion",
    "postalCode",
  ])
    assert.ok(address.indexOf(key) >= 0);
  assert.ok(
    address.indexOf("addressLine1") < address.indexOf("apartmentOrSuite"),
  );
  assert.ok(address.indexOf("apartmentOrSuite") < address.indexOf("city"));
  assert.ok(address.indexOf("city") < address.indexOf("stateOrRegion"));
  assert.ok(address.indexOf("stateOrRegion") < address.indexOf("postalCode"));
  assert.match(screen, /serializeAddress/);
});

test("editable controls keep stable component identity across draft updates", () => {
  const screenStart = screen.indexOf("export function PersonalDetailsScreen");
  for (const component of [
    "Selector",
    "Field",
    "SelectButton",
    "PhoneControl",
  ]) {
    const definition = screen.indexOf(`function ${component}(`);
    assert.ok(definition >= 0, `${component} must be defined`);
    assert.ok(
      definition < screenStart,
      `${component} must be module-scoped so draft updates do not remount focused inputs`,
    );
  }
});
