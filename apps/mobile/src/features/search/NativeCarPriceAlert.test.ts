import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeCarPriceAlert.tsx", "utf8");
const modal = source.slice(source.indexOf("{open ? <Modal"), source.indexOf("</Modal> : null}"));
const close = source.slice(source.indexOf("const closeTargetSheet"), source.indexOf("const toggle"));

test("Cars Price Alert synchronously unmounts on first physical close touch", () => {
  assert.match(close, /const closeTargetSheet = \(\) => \{ setOpen\(false\); \};/);
  assert.doesNotMatch(close, /Keyboard\.dismiss|\.blur\(|async|await|setTimeout|InteractionManager|keyboard(?:Did|Will)(?:Hide|Show)|requestAnimationFrame/);
  assert.match(source, /\{open \? <Modal/);
  assert.doesNotMatch(source, /<Modal visible=\{open\}/);
  assert.match(modal, /accessibilityLabel="Close price alert" disabled=\{pending\} onPressIn=\{closeTargetSheet\} onPress=\{closeTargetSheet\} style=\{styles\.sheetClose\}/);
  assert.match(source, /sheetClose: \{ width: 44, height: 44/);
  assert.doesNotMatch(modal, /<Button label="Cancel"/);
});

test("Cars Price Alert backdrop owns outside touches behind the popup", () => {
  assert.match(modal, /<View pointerEvents="none" style=\{\[StyleSheet\.absoluteFill, styles\.scrim\]\}\/>/);
  assert.match(modal, /<Pressable accessible=\{false\} disabled=\{pending\} onPressIn=\{closeTargetSheet\} onPress=\{closeTargetSheet\} style=\{StyleSheet\.absoluteFill\}\/>/);
  assert.match(modal, /onRequestClose=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
  assert.match(modal, /onAccessibilityEscape=\{\(\) => \{ if \(!pending\) closeTargetSheet\(\); \}\}/);
});

test("Android Cars Price Alert reveals once at the keyboard-safe final position", () => {
  assert.match(source, /Keyboard\.addListener\("keyboardDidShow", \(\) => setAndroidSheetReady\(true\)\)/);
  assert.match(source, /onShow=\{\(\) => \{ if \(Platform\.OS === "android"\) inputRef\.current\?\.focus\(\); \}\}/);
  assert.match(source, /autoFocus=\{Platform\.OS === "ios"\}/);
  assert.match(modal, /<KeyboardAvoidingView style=\{styles\.keyboardAvoider\} behavior="padding" pointerEvents="box-none">/);
  assert.match(source, /Platform\.OS === "android" && !androidSheetReady \? styles\.androidPreparing : undefined/);
  assert.match(source, /androidPreparing: \{ opacity: 0 \}/);
  assert.doesNotMatch(source, /Animated\.|translateY|setTimeout|requestAnimationFrame|InteractionManager/);
  assert.doesNotMatch(source, /behavior=\{Platform\.OS === "ios" \? "padding" : undefined\}/);
});

test("Cars Price Alert keeps decimal input and compact safe-area-aware geometry", () => {
  assert.match(source, /keyboardType="decimal-pad"/);
  assert.match(source, /editable=\{!pending\}/);
  assert.match(source, /scrim: \{ backgroundColor: "rgba\(15, 23, 42, 0\.35\)" \}/);
  assert.match(source, /keyboardAvoider: \{ flex: 1, justifyContent: "flex-end" \}/);
  assert.match(source, /sheet: \{ marginHorizontal: 12,[^}]*borderRadius: 24/);
  assert.match(source, /marginBottom: 12, paddingBottom: Math\.max\(20, insets\.bottom - 12\)/);
  assert.match(source, /sheetHeaderSlot: \{ width: 44, height: 44/);
  assert.match(source, /sheetHeaderTitle: \{ flex: 1, minWidth: 0, textAlign: "center" \}/);
  assert.match(source, /heading: \{ fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  const styles = source.slice(source.indexOf("const styles"));
  for (const name of ["sheet", "sheetBody"]) {
    const rule = styles.match(new RegExp(`${name}: \\{([^}]*)\\}`))?.[1] ?? "";
    assert.doesNotMatch(rule, /flex:\s*1|(?:min)?height:\s*(?:[4-9]\d\d|"\d+%")/i);
  }
  assert.match(source, /backgroundColor: theme\.dark \? theme\.background : "#F2F4F8"/);
  assert.match(source, /backgroundColor: theme\.surface/);
});
