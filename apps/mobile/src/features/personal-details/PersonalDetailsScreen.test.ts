import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
).replace(/\r\n/g, "\n");
const quick = readFileSync(
  "src/features/personal-details/PersonalDetailsQuickEditor.tsx",
  "utf8",
).replace(/\r\n/g, "\n");
const saveButton = readFileSync(
  "src/features/personal-details/PersonalDetailsSaveButton.tsx",
  "utf8",
).replace(/\r\n/g, "\n");
test("overview keeps a continuous list in the agreed field order", () => {
  assert.match(screen, /!pageEditing\s*\?\s*\(/);
  assert.match(
    screen,
    /const detailOrder: DetailKey\[\] = \[\s*"fullName",\s*"email",\s*"phone",\s*"birth",\s*"gender",\s*"nationality",\s*"address",?\s*\]/,
  );
  assert.match(screen, /detailOrder\.map\(\(key, index\)/);
  assert.match(screen, /onPress=\{\(\) => beginEditing\(key\)\}/);
  assert.match(screen, /setActiveDetail\(detail\)/);
  for (const key of [
    "fullName",
    "email",
    "phone",
    "birth",
    "gender",
    "nationality",
    "address",
  ])
    assert.ok(screen.includes(`activeDetail === "${key}"`));
});

test("missing values use localized fallback", () =>
  assert.match(screen, /value\s*\|\|\s*c\.missing/));
test("Cancel restores authoritative saved values", () => {
  assert.match(screen, /setDraft\(saved\s*\|\|\s*\{\}\)/);
  assert.match(screen, /setEditing\(false\)/);
});
test("Save is disabled until dirty and while saving", () =>
  assert.match(saveButton, /disabled=\{!dirty\s*\|\|\s*saving\}/));
test("duplicate submission is prevented and failed save retains draft", () => {
  assert.match(screen, /submitting\.current/);
  assert.doesNotMatch(screen, /catch\{[^}]*setDraft/s);
});
test("success returns to read-only and refreshes stored session identity", () => {
  assert.match(screen, /setEditing\(false\)/);
  assert.match(screen, /updateStoredSessionName/);
});
test("successful Save returns authoritative values without a visible temporary message", () => {
  const save = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );
  assert.ok(
    save.indexOf("await travelApi.updateProfile(payload)") <
      save.indexOf("setEditing(false)"),
  );
  assert.match(save, /setSaved\(authoritative\)/);
  assert.match(save, /setDraft\(authoritative\)/);
  assert.match(
    save,
    /AccessibilityInfo\.announceForAccessibility\(c\.saveSuccess\)/,
  );
  assert.doesNotMatch(
    screen,
    /success-toast|toastPosition|successTimer|showSuccess|setSuccess/,
  );
});

test("Save shows progress inside the button and retains its accessible busy label", () => {
  assert.match(saveButton, /saving && \([\s\S]*?<ActivityIndicator/);
  assert.match(
    saveButton,
    /accessibilityLabel=\{saving \? c.saving : c.save\}/,
  );
  assert.match(saveButton, /busy: saving/);
  assert.match(saveButton, /saving && \{ opacity: 0 \}/);
});

test("failed saves keep the editor open and show actionable error feedback", () => {
  const save = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );
  const failure = save.slice(
    save.indexOf("} catch"),
    save.indexOf("} finally"),
  );
  assert.match(failure, /setError\(c.saveFailure\)/);
  assert.doesNotMatch(
    failure,
    /setEditing\(false\)|setDraft|setSaved|c.saveSuccess/,
  );
  assert.match(screen, /accessibilityLiveRegion="assertive"/);
});

test("email is read-only and external handoff is accessible", () => {
  assert.match(screen, /editable=\{false\}/);
  assert.match(screen, /accessibilityHint=\{c\.externalHint\}/);
});
test("authentication expiry preserves protected return intent", () =>
  assert.match(screen, /signInHref\("\/personal-information"\)/));
test("theme semantics cover shell card inputs and selectors", () => {
  for (const token of [
    "theme.background",
    "theme.border",
    "theme.text",
    "theme.muted",
  ])
    assert.ok(screen.includes(token));
});
test("no avatar identity hero or introductory card is introduced", () => {
  assert.doesNotMatch(screen, /Avatar|initials|identityHero|welcomeCard/);
});
test("header stays visible while shared initial loading and retry states replace content", () => {
  const header = screen.indexOf("<View\n        style={[\n          s.header");
  const state = screen.indexOf(
    '<PageContentState state="loading" pageName="personal details"',
  );
  assert.ok(header >= 0 && header < state);
  assert.match(
    screen,
    /PageContentState\s+state="error"\s+pageName="personal details"\s+onRetry=/,
  );
  assert.match(screen, /Alert\.alert\(c\.discardTitle/);
});
test("overview has no background cards or section headings", () => {
  const overview = screen.slice(
    screen.indexOf("{!pageEditing ? ("),
    screen.indexOf("style={s.formContent}"),
  );
  assert.doesNotMatch(
    overview,
    /backgroundColor|borderRadius|accessibilityRole="header"/,
  );
  assert.doesNotMatch(screen, /detailCard|detailGroup|groupTitle|groups\.map/);
  assert.match(screen, /s\.formContent/);
  assert.doesNotMatch(screen, /formCard|identityHero/);
});

test("country and nationality search selectors wait for an explicit search-field tap", () => {
  assert.doesNotMatch(
    screen,
    /<TextInput autoFocus accessibilityLabel=\{c\.searchCountry\}/,
  );
  assert.doesNotMatch(screen, /autoFocus/);
  assert.match(
    screen,
    /if \(!isOpening\) return;[\s\S]*?Keyboard\.dismiss\(\)/,
  );
});
test("country query stays stable through native dismissal and resets after dismissal", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(selector, /const \[q, setQ\] = useState\(""\)/);
  assert.match(
    selector,
    /useEffect\(\(\) => \{[\s\S]*?if \(!isOpening\) return;[\s\S]*?setQ\(""\)[\s\S]*?\[selected, selectorType, translateX, visible, width\]\)/,
  );
  assert.match(
    selector,
    /const handleDismiss = \(\) => \{[\s\S]*?setQ\(""\)[\s\S]*?onDismiss\(\)/,
  );
  assert.match(selector, /onDismiss=\{handleDismiss\}/);
});
test("phone, nationality, and address searches have independent aliases", () => {
  assert.match(
    screen,
    /PHONE_COUNTRY_OPTIONS\.map[\s\S]*?x\.isoCode[\s\S]*?x\.dialCode[\s\S]*?replace\("\+", ""\)/,
  );
  assert.match(screen, /COUNTRY_OPTIONS\.map[\s\S]*?searchTerms: \[x\.code\]/);
  assert.match(
    quick,
    /NATIONALITY_OPTIONS\.map[\s\S]*?searchTerms: \[COUNTRY_OPTIONS\[index\]\.code\]/,
  );
});
test("country selector is full-screen, keyboard-aware, and only results virtualize", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(selector, /presentationStyle="overFullScreen"/);
  assert.match(selector, /transparent/);
  assert.match(selector, /animationType="none"/);
  assert.match(
    selector,
    /<KeyboardAvoidingView[\s\S]*?behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/,
  );
  assert.ok(selector.indexOf("{title}") < selector.indexOf("<FlatList"));
  assert.ok(selector.indexOf("<TextInput") < selector.indexOf("<FlatList"));
  assert.doesNotMatch(selector, /maxHeight|0\.82/);
  assert.match(selector, /keyboardShouldPersistTaps="handled"/);
  assert.match(selector, /style=\{s\.countryResults\}/);
  assert.match(selector, /data=\{shown\}/);
  assert.match(selector, /keyExtractor=\{\(item\) => item\.value\}/);
  assert.match(selector, /initialNumToRender=\{12\}/);
  assert.doesNotMatch(selector, /shown\.map\(/);
  assert.match(selector, /keyboardDismissMode="interactive"/);
  assert.doesNotMatch(selector, /s\.countryAction|c\.selectorSave/);
});
test("country search accessibility hints match the available filters", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(
    selector,
    /kind === "phone"[\s\S]*?c\.searchCountryPhoneHint[\s\S]*?c\.searchCountryHint/,
  );
});
test("all country-selector dismissal paths preserve visible content until onDismiss", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(selector, /onRequestClose=\{cancel\}/);
  assert.match(selector, /onDismiss=\{handleDismiss\}/);
  assert.ok((selector.match(/onPress=\{cancel\}/g) ?? []).length >= 2);
  assert.match(selector, /closeWithPushAnimation\(onClose\)/);
  assert.match(
    selector,
    /const handleDismiss = \(\) => \{[\s\S]*?setDraftSelection\(selected\)[\s\S]*?onDismiss\(\)/,
  );
});
test("picker mode and dataset survive native close and rapid reopen", () => {
  assert.match(
    screen,
    /\[selectorVisible, setSelectorVisible\] = useState\(false\)/,
  );
  assert.match(screen, /selectorVisibleRef = useRef\(false\)/);
  assert.match(
    screen,
    /const openSelector = \(type:[\s\S]*?selectorVisibleRef\.current = true;[\s\S]*?setSelector\(type\);[\s\S]*?setSelectorVisible\(true\)/,
  );
  assert.match(
    screen,
    /const closeSelector = \(\) => \{[\s\S]*?selectorVisibleRef\.current = false;[\s\S]*?setSelectorVisible\(false\)/,
  );
  assert.match(
    screen,
    /const finishSelectorDismiss = \(\) => \{[\s\S]*?if \(!selectorVisibleRef\.current\) setSelector\(null\)/,
  );
  assert.ok(
    (screen.match(/onDismiss=\{finishSelectorDismiss\}/g) ?? []).length === 1,
  );
  assert.match(quick, /Array\.from\(\{ length: 125 \}/);
});
test("dial codes are exclusive to the phone-country selector", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(selector, /kind === "phone" && phoneOption\?\.dialCode \? \(/);
  assert.match(
    selector,
    /accessibilityLabel=\{`\$\{item\.label\}\$\{kind === "phone"/,
  );
});
test("country selection has an explicit committed-versus-draft lifecycle", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  assert.match(selector, /useState\(selected\)/);
  assert.match(selector, /setDraftSelection\(selected\)/);
  assert.match(selector, /saveSelection\(item\.value\)/);
  assert.match(selector, /onSave\(value\)/);
  assert.doesNotMatch(selector, /await onSave/);
  assert.doesNotMatch(selector, /onSave\(item\.value\)/);
  assert.match(selector, /if \(committing\.current \|\| !value\) return/);
  assert.match(selector, /accessibilityState=\{\{ selected: isSelected \}\}/);
});
test("country selector Save applies only to the current local draft", () => {
  const saveSelector = screen.slice(
    screen.indexOf("const saveCountrySelection"),
    screen.indexOf("const save = async"),
  );
  assert.match(saveSelector, /setDraft\(\(current\) => \{/);
  assert.doesNotMatch(
    saveSelector,
    /travelApi\.updateProfile|setSaved|setSuccess|announceForAccessibility/,
  );
  assert.match(
    saveSelector,
    /kind === "phone"[\s\S]*?\{ \.\.\.current, phoneCountryCode: value \}/,
  );
  assert.match(
    saveSelector,
    /kind === "nationality"[\s\S]*?\{ \.\.\.current, nationality: value \}/,
  );
  assert.match(
    saveSelector,
    /parseAddress\(current\.address \|\| ""\)[\s\S]*?countryCode: value/,
  );
  assert.match(screen, /return saveCountrySelection\(kind, value\)/);
});
test("selector Save stays in Edit mode and merges only its committed value", () => {
  const saveSelector = screen.slice(
    screen.indexOf("const saveCountrySelection"),
    screen.indexOf("const save = async"),
  );
  assert.doesNotMatch(saveSelector, /setEditing\(false\)/);
  assert.match(saveSelector, /setDraft\(\(current\) => \{/);
  assert.match(
    saveSelector,
    /kind === "phone"[\s\S]*?\.\.\.current, phoneCountryCode: value/,
  );
  assert.match(
    saveSelector,
    /kind === "nationality"[\s\S]*?\.\.\.current, nationality: value/,
  );
  assert.match(
    saveSelector,
    /address: serializeAddress\(\{[\s\S]*?\.\.\.parseAddress\(current\.address \|\| ""\),[\s\S]*?countryCode: value/,
  );
});
test("quick fields open directly over the overview without an intermediate page", () => {
  for (const key of ["gender", "nationality", "birth"])
    assert.ok(screen.includes('activeDetail === "' + key + '"'));
  assert.match(screen, /const pageEditing = editing && !quickDetail/);
  assert.match(screen, /quickDetail && \(/);
  assert.match(screen, /detail=\{quickDetail\}/);
  assert.match(screen, /onClose=\{\(\) => discard\(false\)\}/);
  assert.match(quick, /const fullScreen = detail === "nationality"/);
  assert.match(quick, /onRequestClose=\{onClose\}/);
  assert.doesNotMatch(quick, /travelApi|router\./);
});

test("address opens without keyboard and Next moves through fields", () => {
  const address = screen.slice(
    screen.indexOf('activeDetail === "address" &&'),
    screen.indexOf("s.editorFooter"),
  );
  assert.doesNotMatch(address, /autoFocus/);
  assert.match(address, /label=\{c\.street\}/);
  assert.match(address, /returnKeyType="next"/);
  for (const ref of ["cityRef", "stateRef", "postalRef"])
    assert.ok(address.includes(`${ref}.current?.focus()`));
  assert.match(address, /showApartment/);
});

test("edit controls follow the web responsive alignment contract", () => {
  assert.match(screen, /testID="personal-details-phone-row"/);
  assert.match(screen, /countrySegment:\s*\{\s*width:\s*82/);
  assert.match(screen, /phoneInput:\s*\{[\s\S]*?flex:\s*1/);
  assert.match(screen, /localityRow:[\s\S]*flexDirection:\s*"row"/);
  assert.match(screen, /width\s*<\s*340\s*&&\s*s\.localityStack/);
  assert.match(screen, /postalField:\s*\{\s*width:\s*"50%"/);
});
test("dynamic flag is decorative, validated and has a safe ISO fallback", () => {
  assert.match(screen, /getCountryFlagUri\(option\?\.isoCode\)/);
  assert.match(screen, /<Image[\s\S]*?accessible=\{false\}/);
  assert.match(screen, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(screen, /option\?\.isoCode\s*\|\|\s*"--"/);
});
test("phone country changes preserve the local-number draft", () => {
  const saveSelector = screen.slice(
    screen.indexOf("const saveCountrySelection"),
    screen.indexOf("const save = async"),
  );
  assert.match(
    saveSelector,
    /return \{ \.\.\.current, phoneCountryCode: value \}/,
  );
  assert.doesNotMatch(saveSelector, /phoneNumber:/);
});

test("main Save remains the only persistence point and main Cancel restores saved", () => {
  const saveSelector = screen.slice(
    screen.indexOf("const saveCountrySelection"),
    screen.indexOf("const save = async"),
  );
  const mainSave = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );
  assert.doesNotMatch(saveSelector, /travelApi\.updateProfile/);
  assert.match(mainSave, /travelApi\.updateProfile\(payload\)/);
  assert.match(screen, /setDraft\(saved \|\| \{\}\)/);
});
test("address fields retain web order and canonical serializer", () => {
  const address = screen.slice(
    screen.indexOf('activeDetail === "address" &&'),
    screen.indexOf("s.editorFooter"),
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
  assert.ok(
    address.indexOf("address.apartmentOrSuite") <
      address.indexOf("address.city"),
  );
  assert.ok(
    address.indexOf("address.city") < address.indexOf("address.stateOrRegion"),
  );
  assert.ok(
    address.indexOf("address.stateOrRegion") <
      address.indexOf("address.postalCode"),
  );
  assert.match(screen, /serializeAddress/);
});

test("editable controls keep stable component identity across draft updates", () => {
  const screenStart = screen.indexOf("export function PersonalDetailsScreen");
  for (const component of [
    "CountrySelector",
    "CountryFlag",
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

test("Save and validation feedback stay outside the scrolling form", () => {
  const footer = screen.indexOf("s.editorFooter");
  const scrollEnd = screen.lastIndexOf("</ScrollView>", footer);
  assert.ok(scrollEnd > screen.indexOf("ref={scrollRef}"));
  assert.ok(screen.indexOf("<PersonalDetailsSaveButton", footer) > footer);
  assert.match(screen.slice(footer), /accessibilityLiveRegion="assertive"/);
});
test("back returns to the overview and restores its scroll position", () => {
  assert.match(screen, /editing \? discard\(false\) : router\.back\(\)/);
  assert.match(screen, /BackHandler\.addEventListener\(\s*"hardwareBackPress"/);
  assert.match(
    screen,
    /contentOffset=\{\{\s*x: 0,\s*y: pageEditing \? 0 : overviewOffset\.current,?\s*\}\}/,
  );
});
test("text inputs have a visible focus border without remounting", () => {
  assert.match(
    screen,
    /borderColor: focused \? flowColors\.blue : theme\.border/,
  );
  assert.match(screen, /onFocus=\{\(\) => setFocused\(true\)\}/);
  assert.match(screen, /onBlur=\{\(\) => setFocused\(false\)\}/);
});

test("partial date changes participate in discard protection and cannot be saved", () => {
  assert.match(screen, /profilesDiffer\(draft, saved\) \|\| dateDirty/);
  const save = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );
  assert.match(
    save,
    /dateDirty && \(!dateDraft.year \|\| !dateDraft.month \|\| !dateDraft.day\)/,
  );
  assert.ok(
    save.indexOf("setError(c.invalidDate)") <
      save.indexOf("travelApi.updateProfile"),
  );
});

test("main editor avoids the keyboard on Android as well as iOS", () => {
  const main = screen.slice(
    screen.indexOf("<ScrollView\n            ref={scrollRef}"),
  );
  const container = screen.slice(
    0,
    screen.indexOf("<ScrollView\n            ref={scrollRef}"),
  );
  assert.match(
    container.slice(container.lastIndexOf("<KeyboardAvoidingView")),
    /behavior=\{Platform\.OS === "ios" \? "padding" : "height"\}/,
  );
  assert.ok(main.indexOf("s.editorFooter") > main.indexOf("</ScrollView>"));
});

test("editors have one shared full-width Save action and back handles discard", () => {
  const footer = screen.slice(
    screen.indexOf("s.editorFooter"),
    screen.indexOf("</KeyboardAvoidingView>", screen.indexOf("s.editorFooter")),
  );
  assert.equal((footer.match(/<PersonalDetailsSaveButton/g) || []).length, 1);
  assert.doesNotMatch(footer, /c\.cancel/);
  assert.match(saveButton, /width: "100%"/);
  assert.match(saveButton, /busy: saving/);
  assert.match(quick, /<PersonalDetailsSaveButton/);
  assert.match(screen, /editing \? discard\(false\) : router\.back\(\)/);
});
