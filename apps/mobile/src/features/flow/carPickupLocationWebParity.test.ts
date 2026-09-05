import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLocationFieldDisplay } from "../../../../../src/lib/search/locationFieldDisplay";
import { carSearchParams, initializeCarsPageForm } from "./carSearchModel";

const native = readFileSync("src/features/flow/CarSearchPanel.tsx", "utf8");
const web = readFileSync("../../src/components/search/SearchTabs.tsx", "utf8");
const closedNative = native.slice(0, native.indexOf("export function CarLocationSheet"));

test("web and native Cars pickup fields use the shared location display contract", () => {
  assert.match(web, /carsPickupDisplay\s*=\s*getLocationFieldDisplay\(carsValues\.pickupLocation\)/);
  assert.match(web, /carsPickupDisplay\.primary/);
  assert.match(web, /carsPickupDisplay\.secondary/);
  assert.match(native, /import \{ getLocationFieldDisplay \} from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\/lib\/search\/locationFieldDisplay"/);
  assert.match(closedNative, /const pickupLocationDisplay = getLocationFieldDisplay\(form\.pickupLocation\)/);
  assert.doesNotMatch(closedNative, /form\.pickupLocation\.(?:split|substring)\(|form\.pickupLocation\.indexOf\("?,"?\)|nativeCarLocationDisplay/);
});

test("Paris uses separate primary and supporting lines in the native closed field", () => {
  assert.deepEqual(getLocationFieldDisplay("Paris, France"), { primary: "Paris", secondary: "France" });
  assert.match(closedNative, /label="Pickup location"[^\n]*value=\{pickupLocationDisplay\.primary \|\| form\.pickupLocation\.trim\(\) \|\| "Airport, city, or address"\}[^\n]*meta=\{pickupLocationDisplay\.secondary\}[^\n]*metaNumberOfLines=\{1\}[^\n]*muted=\{!form\.pickupLocation\}[^\n]*icon="location"[^\n]*setLocationPicker\("pickup"\)/);
  assert.doesNotMatch(closedNative, /label="Pick-up location"|value=\{form\.pickupLocation \|\| "Airport, city, or address"\}/);
});

test("display formatting does not alter the chosen or serialized pickup value", () => {
  assert.match(native, /setForm\(\{ \.\.\.form, pickupLocation: value \}\)/);
  assert.doesNotMatch(native, /pickupLocation: pickupLocationDisplay\.primary/);
  const form = initializeCarsPageForm({ pickupLocation: "Paris, France" }, new Date(2026, 8, 5)).form;
  assert.equal(form.pickupLocation, "Paris, France");
  assert.equal(carSearchParams(form).pickupLocation, "Paris, France");
});
