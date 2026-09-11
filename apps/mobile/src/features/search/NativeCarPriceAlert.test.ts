import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const modal = source.slice(source.indexOf("{open ? <Modal"), source.indexOf("</Modal> : null}"));
const close = source.slice(source.indexOf("const closeTargetSheet"), source.indexOf("const toggle"));

test("Cars Price Alert synchronously unmounts on first physical close touch", () => {
  assert.match(close, /const closeTargetSheet = \(\) => \{ setOpen\(false\); \};/);
  assert.doesNotMatch(close, /Keyboard\.dismiss|\.blur\(|async|await|setTimeout|InteractionManager|keyboard(?:Did|Will)(?:Hide|Show)|requestAnimationFrame/);
  assert.match(source, /\{open \? <Modal visible transparent animationType="none"/);
  assert.doesNotMatch(source, /<Modal visible=\{open\}/);
  assert.match(modal, /accessibilityLabel="Close price alert" disabled=\{pending\} onPressIn=\{closeTargetSheet\} onPress=\{closeTargetSheet\} style=\{styles\.sheetClose\}/);
  assert.match(source, /sheetClose: \{ width: 44, height: 44/);
  assert.doesNotMatch(modal, /<Button label="Cancel"/);
});

test("Cars Price Alert backdrop owns outside touches behind the popup", () => {
  assert.match(modal, /<View pointerEvents="none" style=\{\[StyleSheet\.absoluteFill, styles\.scrim\]\}\/><Pressable accessible=\{false\} disabled=\{pending\} onPressIn=\{closeTargetSheet\} onPress=\{closeTargetSheet\} style=\{StyleSheet\.absoluteFill\}\/><KeyboardAvoidingView/);
  assert.match(modal, /onRequestClose=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(modal, /onAccessibilityEscape=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(modal, /<KeyboardAvoidingView[^>]*behavior=\{Platform\.OS === "ios" \? "padding" : "height"\} pointerEvents="box-none"/);
  assert.match(modal, /<TextInput autoFocus/);
  assert.match(modal, /keyboardType="decimal-pad" editable=\{!pending\}/);
});

test("Cars Price Alert uses compact safe-area-aware floating geometry", () => {
  assert.match(source, /scrim: \{ backgroundColor: "rgba\(15, 23, 42, 0\.35\)" \}/);
  assert.match(source, /sheet: \{ marginHorizontal: 12,[^}]*borderRadius: 24/);
  assert.match(modal, /marginBottom: 12, paddingBottom: Math\.max\(20, insets\.bottom - 12\)/);
  assert.match(source, /sheetHeaderSlot: \{ width: 44, height: 44/);
  assert.match(source, /sheetHeaderTitle: \{ flex: 1, minWidth: 0, textAlign: "center" \}/);
  assert.match(source, /heading: \{ fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  const styles = source.slice(source.indexOf("const styles"));
  for (const name of ["sheet", "sheetBody"]) {
    const rule = styles.match(new RegExp(`${name}: \\{([^}]*)\\}`))?.[1] ?? "";
    assert.doesNotMatch(rule, /flex:\s*1|(?:min)?height:\s*(?:[4-9]\d\d|"\d+%")/i);
  }
  assert.match(modal, /backgroundColor: theme\.dark \? theme\.background : "#F2F4F8"/);
  assert.match(modal, /backgroundColor: theme\.surface/);
});
