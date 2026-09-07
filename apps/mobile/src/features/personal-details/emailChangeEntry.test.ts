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

test("email verification opens a separate page from the pen inside the email field", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.match(screen, /<Modal visible=\{emailOpen\} animationType="slide" presentationStyle="fullScreen" onRequestClose=\{closeEmail\}/);
 assert.match(screen, /accessibilityState=\{\{ expanded: emailOpen, disabled: emailBusy \}\}/);
 assert.match(screen, /emailBox: \{[^}]*flexDirection: "row"/);
 assert.match(screen, /<Pencil size=\{18\}/);
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


test("email page uses a full-width primary action and the header back control", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.doesNotMatch(editor, /cancelAction|cancelButton|onCancel/);
 assert.match(editor, /primaryAction: \{ flex: 1 \}/);
 assert.match(screen, /onPress=\{closeEmail\} disabled=\{emailBusy\}/);
});


test("email primary actions sit at the bottom with scrollable keyboard-aware content", () => {
 const screen = readFileSync("src/features/personal-details/PersonalDetailsScreen.tsx", "utf8");
 assert.match(screen, /emailScroll: \{ flexGrow: 1, padding: 16, paddingBottom: 16 \}/);
 assert.match(editor, /layout: \{ flexGrow: 1/);
 assert.match(editor, /footer: \{ marginTop: "auto", paddingTop: 24/);
 const page = screen.slice(screen.indexOf("<Modal visible={emailOpen}"), screen.indexOf("{success ? ("));
 assert.match(page, /behavior=\{Platform.OS === "ios" \? "padding" : "height"\}/);
 assert.match(page, /contentContainerStyle=\{s.emailScroll\}/);
});


test("new email entry shares the introduction styles and interactive field behavior", () => {
 assert.match(editor, /style=\{\[s.title, \{ color: theme.text \}\]\}>\{c.emailEnterNew\}/);
 assert.match(editor, /style=\{\[s.help, \{ color: theme.muted \}\]\}>\{c.emailNewHelp\}/);
 const field = editor.slice(editor.indexOf('key="new-email"'), editor.indexOf('{isCodeStep && ('));
 assert.match(field, /autoFocus/);
 assert.match(field, /onSubmitEditing=\{\(\) => void run\("request"\)\}/);
 assert.match(field, /setNewEmail\(value\);\s*setError\(""\)/);
 assert.match(field, /borderColor: focused \? flowColors.blue : borderColor/);
 assert.doesNotMatch(editor, /\{c.emailNextHelp\}/);
});
