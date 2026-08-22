import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("country selector pushes horizontally like a native detail screen", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /transparent/);
  assert.match(selector, /animationType="none"/);
  assert.match(selector, /presentationStyle="overFullScreen"/);
  assert.match(selector, /const translateX = useRef\(new Animated\.Value\(width\)\)\.current/);
  assert.match(selector, /Animated\.timing\(translateX,[\s\S]*?toValue: 0/);
  assert.match(selector, /Animated\.timing\(translateX,[\s\S]*?toValue: width/);
  assert.match(selector, /transform: \[\{ translateX \}\]/);
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
      selector.indexOf("translateX.setValue(width)"),
  );
});

test("a selected prop update cannot restart enter or interrupt exit", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /\[selected, selectorType, translateX, visible, width\]/);
  assert.equal((selector.match(/translateX\.setValue\(width\)/g) ?? []).length, 1);
  assert.match(selector, /if \(!isOpening\) return;[\s\S]*?translateX\.stopAnimation\(\)/);
});

test("country selector keeps first-open controls below the device status bar", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(screen, /useSafeAreaInsets/);
  assert.match(selector, /const insets = useSafeAreaInsets\(\)/);
  assert.match(selector, /paddingTop: insets\.top/);
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

test("row selection updates the draft and dismisses only the keyboard", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );
  const rowHandler = selector.slice(
    selector.indexOf("onPress={() => {", selector.indexOf("renderItem=")),
    selector.indexOf("style={[s.countryOption", selector.indexOf("renderItem=")),
  );

  assert.match(rowHandler, /Keyboard\.dismiss\(\);\s*setDraftSelection\(item\.value\)/);
  assert.doesNotMatch(rowHandler, /onClose|closeWithPushAnimation|onSave/);
});
