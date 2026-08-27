import assert from "node:assert/strict";
import test from "node:test";
import { addAirline, airlinePreferenceLabel, airportPreferenceValue, beginLoad, beginSave, canSubmitSupport, editDraft, failSave, faqAccessibility, filterAirlinePreferences, filterAirportPreferences, filterFaqs, filterOptions, finishLoad, finishSave, initialAsyncDraft, invalidateRequests, isDirty, supportDraft, supportErrors, toggleExpanded } from "./nativeAccountModels";
import { getGeneralFaqs } from "../../../../../src/content/faqs";
import { airports } from "../../../../../src/shared/airports";
import { airlines } from "../../../../../src/data/airlines";
import { dictionaries } from "../../localization/mobileLocalizationCatalog";

test("FAQ localization, search, uniqueness, empty state, and isolated expansion", () => {
  for (const locale of ["en-us", "es-es"] as const) { const t = (key: string) => (dictionaries[locale] as Record<string, string>)[key] ?? key; const items = getGeneralFaqs(t); assert.ok(items.length); assert.ok(items.every(x => x.question && x.answer)); }
  const items = [{ question: "How do fares work?", answer: "Prices update often" }, { question: "Bags", answer: "Check the AIRLINE rules" }, { question: " how do fares work? ", answer: "duplicate" }];
  assert.equal(filterFaqs(items, "  FARES ").length, 1); assert.equal(filterFaqs(items, "airline")[0]?.question, "Bags"); assert.equal(filterFaqs(items, "").length, 2); assert.equal(filterFaqs(items, "never").length, 0);
  let open: string | null = toggleExpanded(null, "one"); assert.deepEqual(faqAccessibility(open, "one"), { expanded: true }); assert.deepEqual(faqAccessibility(open, "two"), { expanded: false }); open = toggleExpanded(open, "two"); assert.equal(open, "two"); assert.equal(toggleExpanded(open, "two"), null);
});

test("support model validates guest/account ownership and locks duplicate submission", () => {
  const guest = supportDraft(); assert.equal(guest.ownedEmail, false); const account = supportDraft("owner@example.com", true); assert.equal(account.ownedEmail, true);
  assert.equal(canSubmitSupport(guest, false), false); assert.deepEqual(supportErrors(guest), { email: true, subject: true, category: false, body: true });
  const valid = { ...account, subject: "Booking help", body: "Please help with this booking." }; assert.equal(canSubmitSupport(valid, false), true); assert.equal(canSubmitSupport(valid, true), false);
  assert.equal(supportErrors({ ...valid, category: "bad" as never }).category, true); assert.equal(supportErrors({ ...valid, subject: "x" }).subject, true);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["supportTitle", "supportSuccess", "supportError", "ticketId"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});

test("email preference async model protects drafts from stale GET/PATCH and supports retry", () => {
  const base = { receiveOptionalEmails: false, priceAlerts: false, travelInspiration: false, productUpdates: false, dealsRecommendations: false };
  let state = initialAsyncDraft(base); assert.equal(state.loading, true); const load = beginLoad(state); state = load.state; state = editDraft(state, { ...base, receiveOptionalEmails: true });
  state = finishLoad(state, load.token, load.editVersion, base); assert.equal(state.draft.receiveOptionalEmails, true); assert.equal(isDirty(state), true);
  const save = beginSave(state); assert.ok(save); state = save.state; assert.equal(beginSave(state), null); state = failSave(state, save.token, "failed"); assert.equal(state.draft.receiveOptionalEmails, true); assert.equal(state.error, "failed");
  const retry = beginSave(state); assert.ok(retry); state = finishSave(retry.state, retry.token, retry.editVersion, retry.value); assert.equal(isDirty(state), false);
  const old = finishSave(state, retry.token - 1, retry.editVersion, base); assert.equal(old.draft.receiveOptionalEmails, true);
  const invalidated = invalidateRequests({ ...retry.state, loading: true }); assert.equal(invalidated.loading, false); assert.equal(invalidated.saving, false); assert.ok(invalidated.requestVersion > retry.token);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["emailPreferences", "emailAllOptional", "emailAllOptionalHelp", "emailSaveError"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});

test("travel model filters canonical data, prevents duplicates/max, and supports save/revert races", () => {
  assert.ok(filterOptions(airports, " jfk ", a => `${a.code} ${a.airport} ${a.city}`).some(a => a.code === "JFK")); assert.ok(filterOptions(airlines, "delta", a => `${a.code} ${a.name}`).some(a => a.code === "DL"));
  assert.deepEqual(addAirline(["AA"], "AA"), ["AA"]); assert.deepEqual(addAirline(Array.from({ length: 10 }, (_, i) => String(i)), "DL").length, 10); assert.deepEqual(addAirline([], "DL"), ["DL"]);
  const base = { homeAirport: "JFK", preferredAirlines: ["AA"] }; let state = initialAsyncDraft(base); state = editDraft(state, { homeAirport: "", preferredAirlines: [] }); assert.equal(isDirty(state), true);
  const save = beginSave(state); assert.ok(save); state = failSave(save.state, save.token, "failed"); assert.deepEqual(state.draft, { homeAirport: "", preferredAirlines: [] });
  const retry = beginSave(state); assert.ok(retry); state = editDraft(retry.state, { homeAirport: "SFO", preferredAirlines: ["UA"] });
  state = finishSave(state, retry.token, retry.editVersion, { homeAirport: "LAX", preferredAirlines: ["DL"] });
  assert.deepEqual(state.saved, { homeAirport: "LAX", preferredAirlines: ["DL"] }); assert.deepEqual(state.draft, { homeAirport: "SFO", preferredAirlines: ["UA"] }); assert.equal(isDirty(state), true);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["travelPreferences", "homeAirport", "preferredAirlines", "airlineMaximum"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});

test("email preference screen uses immediate UI with coalesced persistence", async () => {
  const { readFile } = await import("node:fs/promises");
  const fullSource = await readFile("src/features/account/NativeAccountScreens.tsx", "utf8");
  const screen = fullSource.slice(fullSource.indexOf("export function EmailPreferencesScreen"), fullSource.indexOf("const travelDefaults"));
  assert.match(screen, /requireAccount\("\/email-preferences"\)/);
  assert.match(screen, /travelApi\.emailPreferences\(\)/);
  assert.equal((screen.match(/travelApi\.updateEmailPreferences\(/g) ?? []).length, 1);
  assert.match(screen, /pendingEmailPreferences=useRef<EmailPreferences\|null>\(null\)/);
  assert.match(screen, /persistTimer=useRef<ReturnType<typeof setTimeout>\|null>\(null\)/);
  assert.match(screen, /const schedulePersist=.*editDraft/s);
  assert.match(screen, /setTimeout\(\(\)=>\{persistTimer\.current=null;void flushPending\(\);\},500\)/);
  assert.match(screen, /if\(pendingEmailPreferences\.current\)void flushPending\(\)/);
  assert.match(screen, /draft:confirmed/);
  assert.match(screen, /disabled=\{state\.saving\}/);
  assert.match(screen, /value=\{areAllEmailCategoriesEnabled\(prefs\)\}/);
  assert.match(fullSource, /emailRowCopy:\{flex:1,minWidth:0/);
  assert.match(fullSource, /emailSwitch:\{flexShrink:0\}/);
  assert.match(fullSource, /borderBottomWidth:StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(screen, /emailSurface|emailActions|showSaved|t\("reset"\)|t\("save"\)|opacity:/);
  assert.ok(fullSource.indexOf('label: "emailTravelAlerts"') < fullSource.indexOf('label: "emailInspirationUpdates"'));
});

test("travel selector models resolve labels and filter integrated suggestions", () => {
  assert.equal(airportPreferenceValue("jfk", airports)?.airport, "John F. Kennedy International Airport");
  assert.equal(airportPreferenceValue("", airports), undefined);
  assert.ok(filterAirportPreferences(airports, "kennedy").some(item => item.code === "JFK"));
  assert.equal(filterAirportPreferences(airports, "a").length, 8);
  assert.equal(airlinePreferenceLabel("P4", airlines), "Air Peace (P4)");
  assert.equal(airlinePreferenceLabel("legacy", airlines), "legacy");
  assert.ok(filterAirlinePreferences(airlines, "british", []).some(item => item.code === "BA"));
  assert.ok(filterAirlinePreferences(airlines, "ba", []).some(item => item.code === "BA"));
  assert.ok(!filterAirlinePreferences(airlines, "ba", ["BA"]).some(item => item.code === "BA"));
});

test("travel screen keeps location separate and selectors use draft-only save/revert", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/features/account/NativeAccountScreens.tsx", "utf8");
  const screen = source.slice(source.indexOf("export function TravelPreferencesScreen"), source.indexOf("const s=StyleSheet.create"));
  assert.match(screen, /requireAccount\("\/travel-preferences"\)/);
  assert.doesNotMatch(screen, /travelApi\.location|countryCode/);
  assert.equal((screen.match(/travelApi\.updateTravelPreferences\(/g) ?? []).length, 1);
  assert.match(screen, /updateTravelPreferences\(\{homeAirport:started\.value\.homeAirport,preferredAirlines:started\.value\.preferredAirlines\}\)/);
  assert.doesNotMatch(screen, /updateTravelPreferences\(\{[^}]*notificationPreferences/);
  assert.match(screen, /selectedAirport/);
  assert.doesNotMatch(screen, /homeAirport\} · \{t\("clear"\)/);
  assert.match(screen, /const revert=.*state\.saved/);
  assert.match(screen, /closeSelectors\(\)/);
});

test("travel save errors retry the draft and airport editor restores a saved value on blur", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/features/account/NativeAccountScreens.tsx", "utf8");
  const screen = source.slice(source.indexOf("export function TravelPreferencesScreen"), source.indexOf("const s=StyleSheet.create"));
  assert.match(screen, /setErrorAction\("save"\)/);
  assert.match(screen, /retry=\{errorAction==="save"\?\(\)=>void save\(\):\(\)=>void load\(\)\}/);
  assert.match(screen, /const airportSearchValue=/);
  assert.match(screen, /setAirportQuery\(airportSearchValue\);setAirportOpen\(true\)/);
  assert.match(screen, /onBlur=\{\(\)=>\{if\(value\.homeAirport&&\(!airportQuery\.trim\(\)\|\|airportQuery===airportSearchValue\)\)\{setAirportQuery\(""\);setAirportOpen\(false\);\}\}\}/);
});
