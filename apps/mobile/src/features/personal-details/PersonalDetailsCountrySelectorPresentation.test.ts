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

test("country selector dismisses the keyboard on choice and offers Done on iOS", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /onPress=\{\(\) => \{\s*Keyboard\.dismiss\(\);\s*setDraftSelection\(item\.value\)/);
  assert.match(selector, /inputAccessoryViewID=/);
  assert.match(selector, /<InputAccessoryView nativeID=\{COUNTRY_SEARCH_ACCESSORY\}>/);
  assert.match(selector, /onPress=\{Keyboard\.dismiss\}/);
});

test("country selector hides its save action while the keyboard is visible", () => {
  const selector = screen.slice(
    screen.indexOf("function CountrySelector("),
    screen.indexOf("function CountryFlag("),
  );

  assert.match(selector, /const \[keyboardVisible, setKeyboardVisible\] = useState\(false\)/);
  assert.match(selector, /Keyboard\.addListener\("keyboardDidShow"/);
  assert.match(selector, /Keyboard\.addListener\("keyboardDidHide"/);
  assert.match(selector, /!keyboardVisible \? \(/);
});
