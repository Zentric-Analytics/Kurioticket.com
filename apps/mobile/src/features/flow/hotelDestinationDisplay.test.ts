import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getHotelDestinationPrimaryLabel,
  getHotelDestinationSupportingLabel,
  hotelDestinations,
} from "../../../../../src/data/hotelDestinations";

const panel = readFileSync("src/features/flow/HotelSearchPanel.tsx", "utf8");
const destinationField = panel.match(/<CompactSearchField label="Destination"[^\n]+/)?.[0] ?? "";
const picker = panel.slice(panel.indexOf("export function HotelDestinationSheet"), panel.indexOf("type GuestsRoomsDraft"));

test("default Hotel field resolves display labels without replacing its search value", () => {
  assert.match(panel, /const \{ locale \} = useMobileLocalization\(\)/);
  assert.match(panel, /getHotelLocationFieldDisplay\(form\.destination, locale\)/);
  assert.match(destinationField, /destinationDisplay\.primary/);
  assert.match(destinationField, /meta=\{editAppearance \? undefined : destinationDisplay\.secondary\}/);
  assert.doesNotMatch(destinationField, /value=\{form\.destination \|\|/);
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

test("every catalogue search value delegates to canonical localized labels", () => {
  for (const destination of hotelDestinations) {
    const nativeExpectedPresentation = {
      primary: getHotelDestinationPrimaryLabel(destination, "en-us"),
      secondary: getHotelDestinationSupportingLabel(destination, "en-us"),
    };
    assert.ok(nativeExpectedPresentation.primary, destination.id);
    assert.ok(nativeExpectedPresentation.secondary, destination.id);
  }
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
  assert.match(picker, /getHotelDestinationPrimaryLabel\(item, locale\)/);
  assert.match(picker, /getHotelDestinationSupportingLabel\(item, locale\)/);
  assert.match(picker, /searchHotelDestinations\(trimmedQuery, \{ signal: controller\.signal, limit: 8, locale \}\)/);
  assert.doesNotMatch(picker, /Intl\.DateTimeFormat|item\.region \? `\$\{item\.region\} · \$\{item\.country\}`/);
});

test("picker rows retain immediate searchValue selection and have no confirmation step", () => {
  assert.match(picker, /onChoose\(item\.searchValue\)/);
  assert.doesNotMatch(picker, /<PrimaryButton label="Done"/);
  assert.match(picker, /accessibilityLabel=\{`\$\{name\}, \$\{detail\}`\}/);
});
