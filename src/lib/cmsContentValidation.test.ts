import { cmsOrderForDisplay, cmsOrderForStorage } from "@/lib/cmsOrderPresentation";
import assert from "node:assert/strict";
import test from "node:test";
import { cmsPayloadSchemas, validateCmsEditor, readCmsFieldErrors } from "./cmsContentValidation";
import { cmsPayloadSchemas as serverSchemas } from "@/services/cmsContentService";
import { cmsReorderLabel, sameCmsOrder, sortCmsFaqDirectory } from "./cmsDirectoryPresentation";

const faq = { question: "How do I book?", answer: "Choose a deal.\n\nBook with the provider.", category: "General" };
const flight = { title: "Lagos to London", originCity: "Lagos", originCode: "LOS", destinationCity: "London", destinationCode: "LHR", routeNote: "Compare flights.\n\nCheck provider terms.", image: "/images/london.jpg", imageAlt: "London skyline" };

test("browser and server use the same schemas; paragraph fields preserve line breaks", () => {
  assert.equal(serverSchemas, cmsPayloadSchemas);
  assert.equal(cmsPayloadSchemas.FAQ.parse(faq).answer, faq.answer);
  assert.equal(cmsPayloadSchemas.FAQ.parse({ ...faq, answer: "First\r\n\r\nSecond" }).answer, "First\n\nSecond");
  assert.equal(cmsPayloadSchemas.FLIGHT_ROUTE.parse(flight).routeNote, flight.routeNote);
  for (const character of ["\0", "\t", "\u000b", "\u001b", "\u007f"]) {
    assert.equal(cmsPayloadSchemas.FAQ.safeParse({ ...faq, answer: "First" + character + "Second" }).success, false);
  }
  assert.equal(cmsPayloadSchemas.FAQ.safeParse({ ...faq, question: "First\nSecond" }).success, false);
  assert.equal(cmsPayloadSchemas.FLIGHT_ROUTE.safeParse({ ...flight, title: "First\nSecond" }).success, false);
});

test("blank, fractional and excessive order values fail before any request", () => {
  for (const order of ["", " ", "-1", "0", "0.5", "100002", "NaN", "Infinity"]) assert.ok(validateCmsEditor("FAQ", faq, order).sortOrder, order);
  for (const order of ["1", "100001"]) assert.deepEqual(validateCmsEditor("FAQ", faq, order), {});
});

test("all content field limits and approved image rules apply in the editor", () => {
  const payloads = {
    FAQ: faq,
    FLIGHT_ROUTE: flight,
    HOMEPAGE_DESTINATION: { city: "London", country: "United Kingdom", countryCode: "GB", originCode: "LOS", destinationCode: "LHR", image: "/images/london.jpg", imageAlt: "London" },
    HOTEL_DESTINATION: { name: "London", country: "United Kingdom", countryCode: "GB", kind: "city", searchValue: "London, United Kingdom", canonicalId: "hotel:gb-london", image: "/images/london.jpg", imageAlt: "London" },
  } as const;
  for (const [type, payload] of Object.entries(payloads)) {
    assert.deepEqual(validateCmsEditor(type as keyof typeof payloads, payload, "0"), {}, type);
    for (const field of Object.keys(payload)) {
      const errors = validateCmsEditor(type as keyof typeof payloads, { ...payload, [field]: "x".repeat(5001) }, "0");
      assert.ok(errors[field], `${type}.${field}`);
    }
  }
  assert.ok(validateCmsEditor("FLIGHT_ROUTE", { ...flight, image: "javascript:alert(1)" }, "1").image);
  assert.ok(validateCmsEditor("FLIGHT_ROUTE", { ...flight, destinationCode: "LOS" }, "1").destinationCode);
  assert.deepEqual(readCmsFieldErrors({ fieldErrors: { sortOrder: ["Out of range"], image: ["Image not allowed"] } }), { sortOrder: ["Out of range"], image: ["Image not allowed"] });
});

test("reorder descriptions distinguish repeated city names and reset dirty state at the baseline", () => {
  const a = cmsReorderLabel({ key: "dubai-los", draftPayload: { city: "Dubai", country: "United Arab Emirates", originCode: "LOS", destinationCode: "DXB" } }, "destinations");
  const b = cmsReorderLabel({ key: "dubai-jfk", draftPayload: { city: "Dubai", country: "United Arab Emirates", originCode: "JFK", destinationCode: "DXB" } }, "destinations");
  assert.notEqual(a, b);
  assert.match(a, /United Arab Emirates.*LOS → DXB/);
  assert.equal(sameCmsOrder(["b", "a"], ["a", "b"]), false);
  assert.equal(sameCmsOrder(["a", "b"], ["a", "b"]), true);
  const items = [{ id: "b", key: "second", sortOrder: 1 }, { id: "a", key: "first", sortOrder: 0 }];
  assert.deepEqual(sortCmsFaqDirectory(items).map(item => item.id), ["a", "b"]);
  assert.equal(items[0].id, "b");
});

test("Admin Order starts at 1 while backend values stay zero-based", () => {
  assert.equal(cmsOrderForDisplay(0), 1);
  assert.equal(cmsOrderForDisplay(7), 8);
  assert.equal(cmsOrderForStorage("1"), 0);
  assert.equal(cmsOrderForStorage("8"), 7);
  assert.equal(cmsOrderForStorage("100001"), 100000);
  assert.ok(validateCmsEditor("FAQ", faq, "0").sortOrder);
  assert.deepEqual(validateCmsEditor("FAQ", faq, "1"), {});
});
