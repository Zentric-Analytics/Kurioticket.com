import assert from "node:assert/strict";
import test from "node:test";
import { addAirline, beginLoad, beginSave, canSubmitSupport, editDraft, failSave, faqAccessibility, filterFaqs, filterOptions, finishLoad, finishSave, initialAsyncDraft, isDirty, supportDraft, supportErrors, toggleExpanded } from "./nativeAccountModels";
import { getGeneralFaqs } from "../../../../../src/content/faqs";
import { airports } from "../../../../../src/shared/airports";
import { airlines } from "../../../../../src/data/airlines";
import { dictionaries } from "../../localization/mobileLocalization";

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
  assert.equal(supportErrors({ ...valid, category: "bad" }).category, true); assert.equal(supportErrors({ ...valid, subject: "x" }).subject, true);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["supportTitle", "supportSuccess", "supportError", "ticketId"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});

test("email preference async model protects drafts from stale GET/PATCH and supports retry", () => {
  const base = { receiveOptionalEmails: false, priceAlerts: false, travelInspiration: false, productUpdates: false, dealsRecommendations: false };
  let state = initialAsyncDraft(base); assert.equal(state.loading, true); const load = beginLoad(state); state = load.state; state = editDraft(state, { ...base, receiveOptionalEmails: true });
  state = finishLoad(state, load.token, load.editVersion, base); assert.equal(state.draft.receiveOptionalEmails, true); assert.equal(isDirty(state), true);
  const save = beginSave(state); assert.ok(save); state = save.state; assert.equal(beginSave(state), null); state = failSave(state, save.token, "failed"); assert.equal(state.draft.receiveOptionalEmails, true); assert.equal(state.error, "failed");
  const retry = beginSave(state); assert.ok(retry); state = finishSave(retry.state, retry.token, retry.value); assert.equal(isDirty(state), false);
  const old = finishSave(state, retry.token - 1, base); assert.equal(old.draft.receiveOptionalEmails, true);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["emailPreferences", "masterDisabled", "saved"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});

test("travel model filters canonical data, prevents duplicates/max, and supports save/revert races", () => {
  assert.ok(filterOptions(airports, " jfk ", a => `${a.code} ${a.airport} ${a.city}`).some(a => a.code === "JFK")); assert.ok(filterOptions(airlines, "delta", a => `${a.code} ${a.name}`).some(a => a.code === "DL"));
  assert.deepEqual(addAirline(["AA"], "AA"), ["AA"]); assert.deepEqual(addAirline(Array.from({ length: 10 }, (_, i) => String(i)), "DL").length, 10); assert.deepEqual(addAirline([], "DL"), ["DL"]);
  const base = { homeAirport: "JFK", preferredAirlines: ["AA"] }; let state = initialAsyncDraft(base); state = editDraft(state, { homeAirport: "", preferredAirlines: [] }); assert.equal(isDirty(state), true);
  const save = beginSave(state); assert.ok(save); state = failSave(save.state, save.token, "failed"); assert.deepEqual(state.draft, { homeAirport: "", preferredAirlines: [] });
  const retry = beginSave(state); assert.ok(retry); state = finishSave(retry.state, retry.token, { homeAirport: "LAX", preferredAirlines: ["DL"] }); assert.equal(isDirty(state), false);
  for (const locale of ["en-us", "es-es"] as const) for (const key of ["travelPreferences", "homeAirport", "preferredAirlines", "airlineMaximum"]) assert.ok((dictionaries[locale] as Record<string, string>)[key]);
});
