import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizedEmail } from "./emailChangeModel";
const editor = readFileSync("src/features/personal-details/PersonalDetailsEmailEditor.tsx", "utf8");
test("opening the email editor never requests a code", () => {
 const lifecycle = editor.slice(editor.indexOf("mounted.current = true"), editor.indexOf("const timer = setInterval"));
 assert.doesNotMatch(lifecycle, /run\("request"\)|requestCurrentEmailCode/);
 assert.match(editor, /setCurrentEntry\] = useState\(true\)/);
});
test("explicit Send code validates current email before the request", () => {
 assert.equal(normalizedEmail(" PERSON@Example.com "), normalizedEmail("person@example.com"));
 assert.notEqual(normalizedEmail("other@example.com"), normalizedEmail("person@example.com"));
 const validation = editor.indexOf("normalizedEmail(currentEmail) !== normalizedEmail(email)");
 assert.ok(validation > 0 && validation < editor.indexOf("travelApi.requestCurrentEmailCode()"));
 assert.match(editor, /setError\(c.emailCurrentMismatch\);\s*return;/);
 assert.match(editor, /emailSendInitial/);
 assert.match(editor, /onSave=\{\(\) => void run\("request"\)\}/);
 assert.match(editor, /if \(step === 1\) setCurrentEntry\(false\)/);
});

test("email verification expands in the form with a right-aligned app-font action", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.doesNotMatch(screen, /<Modal visible=\{emailOpen\}/);
 assert.match(screen, /accessibilityState=\{\{ expanded: emailOpen, disabled: emailBusy \}\}/);
 assert.match(screen, /changeEmailHit: \{[^}]*alignSelf: "flex-end"/);
 assert.match(screen, /changeEmailText: \{[^}]*fontFamily: appFonts.semibold/);
 assert.doesNotMatch(editor, /ScrollView|layout: \{ flex: 1/);
});

test("email session expiry bypasses navigation guards synchronously", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.match(editor, /failure.status === 401\) \{\s*onSessionExpired\(\);\s*return;/);
 assert.match(screen, /onSessionExpired=\{handleEmailSessionExpired\}/);
 const redirect = screen.slice(screen.indexOf("const handleEmailSessionExpired"), screen.indexOf("const closeEmail"));
 assert.ok(redirect.indexOf("sessionExpired.current = true") < redirect.indexOf("router.replace"));
 const guard = screen.slice(screen.indexOf('navigation.addListener("beforeRemove"'));
 assert.ok(guard.indexOf("if (sessionExpired.current) return") < guard.indexOf("if (emailBusy)"));
});

test("profile Save preserves an idle unfinished email change", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.match(screen, /if \(!saved \|\| !dirty \|\| submitting.current \|\| emailBusy \|\| emailDirty\) return;/);
 assert.match(screen, /disabled=\{!dirty \|\| saving \|\| emailBusy \|\| emailDirty\}/);
 assert.match(screen, /disabled: !dirty \|\| saving \|\| emailBusy \|\| emailDirty/);
 assert.match(screen, /\(!dirty \|\| saving \|\| emailBusy \|\| emailDirty\) && s.disabled/);
});
