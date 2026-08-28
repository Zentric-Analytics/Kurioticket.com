import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMobileFaqCopy } from "./mobileFaqCopy";

const screenSource = readFileSync(new URL("./MobileFaqScreen.tsx", import.meta.url).pathname, "utf8");
const routeSource = readFileSync(new URL("../../../app/faq.tsx", import.meta.url).pathname, "utf8");

test("FAQ route uses the dedicated native mobile FAQ screen", () => {
  assert.match(routeSource, /MobileFaqScreen/);
  assert.match(screenSource, /getGeneralFaqs/);
  assert.doesNotMatch(screenSource, /TextInput/);
  assert.doesNotMatch(screenSource, /faqSearch/);
  assert.doesNotMatch(screenSource, /clearSearch/);
});

test("mobile FAQ mirrors the web hierarchy without web navigation chrome", () => {
  const english = getMobileFaqCopy("en-us");
  assert.equal(english.heading, "Frequently asked questions");
  assert.equal(english.generalQuestions, "General questions");
  assert.match(english.intro, /compare flights, hotels, and travel options/);
  assert.match(screenSource, /presentation\.heading/);
  assert.match(screenSource, /presentation\.intro/);
  assert.match(screenSource, /presentation\.generalQuestions/);
  assert.match(screenSource, /borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.match(screenSource, /expanded \? "−" : "\+"/);
});

test("FAQ keeps inline expansion and native support handoff", () => {
  const english = getMobileFaqCopy("en-us");
  assert.equal(english.needMoreHelp, "Need more help?");
  assert.equal(english.supportPrompt, "Can’t find what you’re looking for?");
  assert.equal(english.supportSuffix, " and we’ll help you.");

  assert.match(screenSource, /faqAccessibility\(open, item\.question\)/);
  assert.match(screenSource, /toggleExpanded\(current, item\.question\)/);
  assert.match(screenSource, /accessibilityHint=\{accessibilityState\.expanded \? t\("collapseAnswer"\) : t\("expandAnswer"\)\}/);
  assert.match(screenSource, /presentation\.needMoreHelp/);
  assert.match(screenSource, /presentation\.supportPrompt/);
  assert.match(screenSource, /presentation\.supportSuffix/);
  assert.match(screenSource, /router\.push\("\/support"\)/);
  assert.match(screenSource, /accessibilityRole="link"/);
  assert.match(screenSource, /t\("contactSupport"\)/);
  assert.doesNotMatch(screenSource, /t\("helpSupport"\)/);
});
