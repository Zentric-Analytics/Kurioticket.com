import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createJiti } from "jiti";
import {
  getHotelDestinationPrimaryLabel,
  getHotelDestinationSupportingLabel,
  hotelDestinations,
} from "../../../../../src/data/hotelDestinations";

const jiti = createJiti(import.meta.url, {
  alias: { "@": new URL("../../../../../src", import.meta.url).pathname },
});
const { getHotelLocationFieldDisplay } = jiti(
  "../../../../../src/lib/search/hotelLocationFieldDisplay.ts",
) as typeof import("../../../../../src/lib/search/hotelLocationFieldDisplay");

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const destinationField = panel.match(/<CompactSearchField label="Destination"[^\n]+/)?.[0] ?? "";
const picker = panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));

test("default and Results Edit Hotel fields resolve display labels without replacing the search value", () => {
  assert.match(panel, /const \{ locale \} = useMobileLocalization\(\)/);
  assert.match(panel, /getHotelLocationFieldDisplay\(form\.destination, locale\)/);
  assert.match(destinationField, /destinationDisplay\.primary/);
  assert.match(destinationField, /value=\{destinationDisplay\.primary \|\| form\.destination\.trim\(\) \|\| "City or hotel"\}/);
  assert.match(destinationField, /meta=\{editAppearance \? undefined : destinationDisplay\.secondary\}/);
  assert.doesNotMatch(destinationField, /value=\{editAppearance \?/);
  assert.match(panel, /onChoose=\{\(destination\) => \{ update\(\{ \.\.\.form, destination \}\)/);
  assert.match(panel, /hotelSearchParams\(form\)/);
});

test("Paris and representative values use the shared web display contract", () => {
  const labels = (searchValue: string, locale = "en-us") => {
    const destination = hotelDestinations.find((item) => item.searchValue === searchValue);
    assert.ok(destination);
    return {
      primary: getHotelDestinationPrimaryLabel(destination, locale),
      secondary: getHotelDestinationSupportingLabel(destination, locale),
    };
  };
  assert.deepEqual(labels("Paris, France"), { primary: "Paris", secondary: "Île-de-France, France" });
  assert.deepEqual(labels("Montreal, Canada"), { primary: "Montreal", secondary: "Quebec, Canada" });
  assert.deepEqual(labels("Berlin, Germany"), { primary: "Berlin", secondary: "Germany" });
  assert.deepEqual(labels("JFK Airport area, New York"), { primary: "JFK Airport area", secondary: "New York, United States" });
  assert.match(panel, /getHotelLocationFieldDisplay\(form\.destination, locale\)/);
});

test("Hotel Results Edit uses customer-facing primary labels for every catalogue destination", () => {
  for (const destination of hotelDestinations) {
    const actual = getHotelLocationFieldDisplay(destination.searchValue, "en-us");
    assert.deepEqual(actual, {
      primary: getHotelDestinationPrimaryLabel(destination, "en-us"),
      secondary: getHotelDestinationSupportingLabel(destination, "en-us"),
    });
    assert.ok(actual.primary, destination.id);
    assert.equal(destination.searchValue, hotelDestinations.find((item) => item.id === destination.id)?.searchValue);
  }
});

test("Results Edit displays the primary label while picker, selection, and submit stay canonical", () => {
  const canonical = "Paris, France";
  assert.equal(getHotelLocationFieldDisplay(canonical, "en-us").primary, "Paris");
  assert.match(destinationField, /value=\{destinationDisplay\.primary \|\| form\.destination\.trim\(\) \|\| "City or hotel"\}/);
  assert.match(destinationField, /meta=\{editAppearance \? undefined : destinationDisplay\.secondary\}/);
  assert.match(panel, /<HotelDestinationSheet visible=\{destinationOpen\} value=\{form\.destination\}/);
  assert.match(picker, /onChoose\(item\.searchValue\)/);
  assert.match(panel, /hotelSearchParams\(form\)/);
  assert.doesNotMatch(panel, /destination:\s*destinationDisplay\.primary/);
});

test("the selected mobile locale controls field and picker labels", () => {
  const paris = hotelDestinations.find((item) => item.searchValue === "Paris, France");
  assert.ok(paris);
  assert.deepEqual({
    primary: getHotelDestinationPrimaryLabel(paris, "es-es"),
    secondary: getHotelDestinationSupportingLabel(paris, "es-es"),
  }, {
    primary: "París",
    secondary: "Île-de-France, Francia",
  });
  assert.equal(getHotelLocationFieldDisplay("Paris, France", "es-es").primary, "París");
  assert.equal("Paris, France", paris.searchValue);
  assert.match(picker, /getHotelDestinationPrimaryLabel\(item, locale\)/);
  assert.match(picker, /getHotelDestinationSupportingLabel\(item, locale\)/);
  assert.match(picker, /searchHotelDestinations\(trimmedQuery, \{ signal: controller\.signal, limit: 8, locale \}\)/);
  assert.doesNotMatch(picker, /Intl\.DateTimeFormat|item\.region \? `\$\{item\.region\} · \$\{item\.country\}`/);
});

test("custom destinations retain a safe non-catalogue display fallback", () => {
  const canonical = "Custom Beach";
  assert.deepEqual(getHotelLocationFieldDisplay(canonical, "en-us"), { primary: "Custom Beach" });
  assert.equal(canonical, "Custom Beach");
});

test("picker rows retain immediate searchValue selection and have no confirmation step", () => {
  assert.match(picker, /onChoose\(item\.searchValue\)/);
  assert.doesNotMatch(picker, /<PrimaryButton label="Done"/);
  assert.match(picker, /accessibilityLabel=\{`\$\{name\}, \$\{detail\}`\}/);
});
