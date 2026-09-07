import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("nationality slides from the bottom like the gender sheet", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /transparent/);
  assert.match(selector, /animationType="none"/);
  assert.match(selector, /presentationStyle="overFullScreen"/);
  assert.match(selector, /const translateY = useRef\(new Animated\.Value\(height\)\)\.current/);
  assert.match(selector, /Animated\.timing\(translateY,[\s\S]*?toValue: 0/);
  assert.match(selector, /Animated\.timing\(translateY,[\s\S]*?toValue: height/);
  assert.match(selector, /transform: \[\{ translateY \}\]/);
});

test("enter animation runs only for a closed-to-open transition", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /const wasVisibleRef = useRef\(false\)/);
  assert.match(
    selector,
    /const isOpening = visible && !wasVisibleRef\.current;\s*wasVisibleRef\.current = visible;\s*if \(!isOpening\) return;/,
  );
  assert.ok(
    selector.indexOf("if (!isOpening) return") <
      selector.indexOf("translateY.setValue(height)"),
  );
});

test("a selected prop update cannot restart enter or interrupt exit", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /\[selected, selectorType, translateY, visible, height\]/);
  assert.equal((selector.match(/translateY\.setValue\(height\)/g) ?? []).length, 1);
  assert.match(selector, /if \(!isOpening\) return;[\s\S]*?translateY\.stopAnimation\(\)/);
});

test("country selector keeps first-open controls below the device status bar", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(screen, /useSafeAreaInsets/);
  assert.match(selector, /const insets = useSafeAreaInsets\(\)/);
  assert.match(selector, /height: height \* 0\.82/);
  assert.match(selector, /paddingBottom: insets\.bottom/);
});

test("country selector ignores a stale native dismiss after a new open", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /const visibleRef = useRef\(visible\)/);
  assert.match(
    selector,
    /useEffect\(\(\) => \{\s*visibleRef\.current = visible;\s*\}, \[visible\]\)/,
  );
  assert.match(
    selector,
    /const handleDismiss = \(\) => \{\s*if \(visibleRef\.current\) return;/,
  );
});

test("country selector dismisses the keyboard on choice and keeps the native Done key", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /onPress=\{\(\) => \{\s*Keyboard\.dismiss\(\);\s*setDraftSelection\(item\.value\)/);
  assert.match(selector, /returnKeyType="done"/);
  assert.match(selector, /blurOnSubmit/);
  assert.match(selector, /onSubmitEditing=\{Keyboard\.dismiss\}/);
  assert.doesNotMatch(selector, /inputAccessoryViewID|InputAccessoryView/);
  assert.doesNotMatch(screen, /COUNTRY_SEARCH_ACCESSORY/);
});

test("country selector hides its save action while the keyboard is visible", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /const \[keyboardVisible, setKeyboardVisible\] = useState\(false\)/);
  assert.match(selector, /Keyboard\.addListener\("keyboardDidShow"/);
  assert.match(selector, /Keyboard\.addListener\("keyboardWillShow"/);
  assert.match(selector, /Keyboard\.addListener\("keyboardDidHide"/);
  assert.match(selector, /onFocus=\{\(\) => setKeyboardVisible\(true\)\}/);
  assert.match(selector, /!keyboardVisible \? \(/);
});

test("phone and address selects apply the draft immediately and close without picker actions", () => {
  const dialog = screen.slice(screen.indexOf('  if (["phone", "addressCountry"].includes(kind)) {'), screen.indexOf('      animationType="none"', screen.indexOf('  if (["phone", "addressCountry"].includes(kind)) {')));
  assert.match(dialog, /if \(onSave\(item.value\)\) onClose\(\)/);
  assert.match(dialog, /initialScrollIndex/);
  assert.match(dialog, /accessibilityRole="menuitem"/);
  assert.doesNotMatch(dialog, /TextInput|selectorSave|name="close"/);
});

test("Both platforms country menus anchor to the field and use leading checks without a dimmed dialog", () => {
  const menu = screen.slice(screen.indexOf('  if (["phone", "addressCountry"].includes(kind))'), screen.indexOf('      animationType="none"', screen.indexOf('  if (["phone", "addressCountry"].includes(kind))')));
  assert.match(menu, /anchor\?\.y/);
  assert.match(menu, /anchor\?\.x/);
  assert.match(menu, /s.floatingCountryCheck/);
  assert.match(menu, /name="check"/);
  assert.doesNotMatch(menu, /genderRadio|rgba\(|countrySelectTitle/);
  assert.match(screen, /measureInWindow/);
  assert.match(screen, /openSelector\("phone", anchor\)/);
  assert.match(screen, /openSelector\("addressCountry", anchor\)/);
});


test("nationality waits for native presentation and fades the backdrop with its slide", () => {
 const selector = screen.slice(screen.indexOf("function CountrySelector("), screen.indexOf("function CountryFlag("));
 const preparation = selector.slice(selector.indexOf("const isOpening"), selector.indexOf("const showSheet"));
 assert.doesNotMatch(preparation, /Animated.timing/);
 assert.match(selector, /onShow=\{showSheet\}/);
 assert.match(selector, /if \(!visibleRef.current\) return;\s*Animated.timing/);
 assert.match(selector, /easing: Easing.out\(Easing.cubic\)/);
 assert.match(selector, /opacity: translateY.interpolate/);
});
