import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const remove = source.slice(source.indexOf("const remove ="), source.indexOf("const signOutOthers"));
const others = source.slice(source.indexOf("const signOutOthers"), source.indexOf("const all"));

test("individual revoke always reconciles after success and only shows modal feedback while current", () => {
  const success = remove.slice(remove.indexOf(".then"), remove.indexOf(".catch"));
  assert.match(success, /setSessions\(current => current\.filter\(session => session\.id !== item\.id\)\)/);
  assert.match(success, /setManagedSession\(current => current\?\.id === item\.id \? null : current\)/);
  assert.match(success, /if \(request === devicesRequest\.current\) \{ setDevicesError\(""\); showDevicesSuccess\(c\.sessionRemoved\); \}/);
  assert.match(success, /void load\(\{ showLandingFeedback: false, showLoading: false \}\)/);
  assert.doesNotMatch(remove.slice(0, remove.indexOf(".then")), /showDevicesSuccess|setSessions/);
  assert.doesNotMatch(remove.slice(remove.indexOf(".catch")), /showDevicesSuccess|setSessions/);
});

test("revoke others always reconciles current sessions and only reports confirmed success in the active modal", () => {
  const success = others.slice(others.indexOf(".then"), others.indexOf(".catch"));
  assert.match(success, /setSessions\(current=>current\.filter\(item=>item\.isCurrent\)\)/);
  assert.match(success, /if\(request===devicesRequest\.current\)\{setManagedSession\(null\);setDevicesError\(""\);showDevicesSuccess\(c\.signedOutOtherDevices\);\}/);
  assert.match(success, /else\{setManagedSession\(current=>current\?\.isCurrent\?current:null\);\}/);
  assert.match(success, /void load\(\{showLandingFeedback:false,showLoading:false\}\)/);
  assert.doesNotMatch(others.slice(others.indexOf(".catch")), /showDevicesSuccess|setSessions/);
});

test("session success is transient, restartable, announced, and cleared on close", () => {
  assert.match(source, /if \(devicesSuccessTimer\.current\) clearTimeout\(devicesSuccessTimer\.current\)/);
  assert.match(source, /setDevicesSuccessSequence\(current => current \+ 1\)/);
  assert.match(source, /setTimeout\(\(\) => \{ devicesSuccessTimer\.current = null; setDevicesSuccess\(""\); \}, 1000\)/);
  assert.match(source, /AccessibilityInfo\.announceForAccessibility\(message\)/);
  assert.match(source, /const closeDevices = \(\) => \{[^}]*clearDevicesSuccess\(\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => \{ if \(devicesSuccessTimer\.current\) clearTimeout/);
});

test("session success is a viewport-anchored compact pill with theme-aware contrast", () => {
  const modalStart = source.indexOf('<ScreenModal visible={devicesOpen}');
  const modalEnd = source.indexOf('<ScreenModal visible={twoFactorOpen}', modalStart);
  const modal = source.slice(modalStart, modalEnd);
  const notice = source.slice(source.indexOf("function SessionSuccessNotice"), source.indexOf("function Button"));
  assert.match(modal, /overlay=\{<>\<SessionSuccessNotice message=\{devicesSuccess\} sequence=\{devicesSuccessSequence\} \/>\{sessionSheet\}<\/>\}/);
  assert.doesNotMatch(modal, /<View style=\{styles\.devicesContent\}>\s*<SessionSuccessNotice/);
  assert.match(notice, /const successColor = theme\.dark \? "#6CE9A6" : "#067647"/);
  assert.match(notice, /<Check size=\{15\} strokeWidth=\{2\.5\} color=\{successColor\}/);
  assert.match(notice, /styles\.sessionNoticeText,\{color:successColor\}/);
  assert.match(source, /sessionNoticePosition: \{ position: "absolute", top: "52%"/);
  assert.match(source, /borderRadius: 999/);
  assert.match(source, /Animated\.timing\(opacity, \{ toValue: 0, duration: 180/);
  assert.match(source, /pointerEvents="none"/);
});
