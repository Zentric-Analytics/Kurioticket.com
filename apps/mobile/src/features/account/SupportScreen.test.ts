import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dictionaries } from "../../localization/mobileLocalizationCatalog";
import { supportCategories, supportDraft } from "./nativeAccountModels";

const source = readFileSync(new URL("./NativeAccountScreens.tsx", import.meta.url).pathname, "utf8");

test("support form keeps its submission and account identity contracts", () => {
  assert.match(source, /travelApi\.profile\(\)/);
  assert.match(source, /email:r\.user\.email, ownedEmail:true/);
  assert.match(source, /editable=\{!draft\.ownedEmail\}/);
  assert.match(source, /if\(busy\)return/);
  assert.match(source, /canSubmitSupport\(draft, busy\)/);
  assert.match(source, /travelApi\.createSupportTicket\(\{email:draft\.email,subject:draft\.subject,category:draft\.category,body:draft\.body,sourceContext:\{page:"mobile_support",platform:/);

  const guest = supportDraft("guest@example.com");
  assert.equal(guest.ownedEmail, false);
  assert.equal(supportDraft("account@example.com", true).ownedEmail, true);
});

test("support form exposes localized guidance and direct category choices", () => {
  const english = dictionaries["en-us"];
  assert.equal(english.supportMessage, "How can we help?");
  assert.equal(english.supportSubjectPlaceholder, "Briefly describe the issue");
  assert.equal(english.supportMessagePlaceholder, "Share the route, hotel, alert, or account context.");
  assert.match(english.supportIntro, /route, hotel, alert, or account details/);

  assert.match(source, /accessibilityRole="radiogroup"/);
  assert.match(source, /supportCategories\.map/);
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityState=\{\{checked:selected\}\}/);
  assert.match(source, /setDraft\(current=>\(\{\.\.\.current,category\}\)\)/);
  assert.doesNotMatch(source, /(?:Modal|Picker|BottomSheet).*supportCategor/);
  assert.deepEqual(supportCategories, ["search-help", "price-alerts", "redirect", "account"]);
  for (const category of supportCategories) assert.ok(english[`category_${category}`]);
});

test("support failures preserve the draft and success keeps the ticket flow", () => {
  const catchBody = source.match(/catch\(e\)\{(?<body>.*?)\}finally/)?.groups?.body ?? "";
  assert.doesNotMatch(catchBody, /setDraft/);
  assert.match(source, /setTicket\(r\.ticket\.id\)/);
  assert.match(source, /<Text selectable[^>]*>\{t\("ticketId"\)\}: \{ticket\}/);
  assert.match(source, /supportDraft\(current\.email, current\.ownedEmail\)/);
  assert.match(source, /setError\(""\)/);
});
