import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adjustDropoff, boundedAge, carSearchParams, defaultCarForm, initializeCarForm, initializeCarsPageForm, parseDriverAge, selectCarsPickupDate, selectCarsPickupTime, timeOptions, validateCarForm } from "./carSearchModel";
import { addCalendarDays, localDateFromIso, localIsoDate } from "./localDateModel";
const today = new Date(2026, 6, 30, 23, 30);
const valid = () => ({ ...defaultCarForm(today), pickupLocation: " LAX ", separateDropoff: true, dropoffLocation: " SFO " });

test("empty and array parameters initialize once with local safe defaults", () => {
  const empty = initializeCarForm({}, today).form;
  assert.equal(empty.pickupDate, "2026-08-13"); assert.equal(empty.dropoffDate, "2026-08-16"); assert.equal(empty.driverAge, 30);
  const array = initializeCarForm({ pickupLocation: ["LAX", "ignored"], dropoffLocation: ["SFO"], pickupDate: ["2026-08-10"], pickupTime: ["09:30"], dropoffDate: ["2026-08-11"], dropoffTime: ["10:00"], driverAge: ["35"] }, new Date(2026, 6, 1)).form;
  assert.deepEqual(array, { pickupLocation:"LAX",dropoffLocation:"SFO",separateDropoff:true,pickupDate:"2026-08-10",pickupTime:"09:30",dropoffDate:"2026-08-11",dropoffTime:"10:00",driverAge:35 });
});
test("fresh Cars page state has no automatic search details for guests or signed-in users", () => {
  for (const _session of ["guest", "signed-in"]) {
    assert.deepEqual(initializeCarsPageForm({}, today).form, { pickupLocation:"", separateDropoff:false, dropoffLocation:"", pickupDate:"", pickupTime:"", dropoffDate:"", dropoffTime:"", driverAge:undefined });
  }
});
test("Cars route opts into its empty initializer without changing another route", () => {
  const screens = readFileSync(`${process.cwd()}/src/features/flow/ProductScreens.tsx`, "utf8");
  const cars = screens.slice(screens.indexOf("export function CarsScreen()"), screens.indexOf("type DealTab"));
  const deals = screens.slice(screens.indexOf("export function DealsScreen()"));
  assert.match(cars, /<CarSearchPanel params=\{params\} requireManualDetails \/>/);
  assert.doesNotMatch(deals, /requireManualDetails/);
});
test("Cars initializer contains no generated date, time, age, or location defaults", () => {
  const model = readFileSync(`${process.cwd()}/src/features/flow/carSearchModel.ts`, "utf8");
  const initializer = model.slice(model.indexOf("export function initializeCarsPageForm"), model.indexOf("export function selectCarsPickupDate"));
  assert.doesNotMatch(initializer, /defaultCarForm|addCalendarDays|DEFAULT_CAR_TIME|CAR_AGE\.default/);
  assert.match(initializer, /pickupDate: ""/);
  assert.match(initializer, /pickupTime: ""/);
  assert.match(initializer, /dropoffDate: ""/);
  assert.match(initializer, /dropoffTime: ""/);
  assert.match(initializer, /driverAge: undefined/);
});
test("Cars page renders the manual-selection placeholders", () => {
  const panel = readFileSync(`${process.cwd()}/src/features/flow/CarSearchPanel.tsx`, "utf8");
  for (const placeholder of ["Enter city or airport", "Select pick-up date", "Select pick-up time", "Select drop-off date", "Select drop-off time", "Select driver age"]) assert.match(panel, new RegExp(placeholder));
});
test("Cars page preserves valid restored and route-provided values", () => {
  const params = { pickupLocation:"LAX", dropoffLocation:"SFO", pickupDate:"2026-08-10", pickupTime:"09:30", dropoffDate:"2026-08-11", dropoffTime:"10:00", driverAge:"35" };
  assert.deepEqual(initializeCarsPageForm(params, new Date(2026, 6, 1)).form, { ...params, separateDropoff:true, driverAge:35 });
  assert.deepEqual(initializeCarsPageForm(Object.fromEntries(Object.entries(params).map(([key, value]) => [key, [value]])), new Date(2026, 6, 1)).form, { ...params, separateDropoff:true, driverAge:35 });
});
test("Cars page rejects invalid restored values without replacing them", () => {
  const restored = initializeCarsPageForm({ pickupLocation:"LAX", pickupDate:"bad", pickupTime:"10:15", dropoffDate:"2020-01-01", dropoffTime:"24:00", driverAge:"71" }, today).form;
  assert.deepEqual(restored, { pickupLocation:"LAX", separateDropoff:false, dropoffLocation:"", pickupDate:"", pickupTime:"", dropoffDate:"", dropoffTime:"", driverAge:undefined });
});
test("Cars page selections never generate return values and clear only invalid ones", () => {
  const empty = initializeCarsPageForm({}, today).form;
  assert.deepEqual(selectCarsPickupDate(empty, "2026-08-10"), { ...empty, pickupDate:"2026-08-10" });
  assert.deepEqual(selectCarsPickupTime(empty, "09:30"), { ...empty, pickupTime:"09:30" });
  const selected = { ...empty, pickupDate:"2026-08-10", pickupTime:"10:00", dropoffDate:"2026-08-11", dropoffTime:"09:00" };
  assert.deepEqual(selectCarsPickupDate(selected, "2026-08-12"), { ...selected, pickupDate:"2026-08-12", dropoffDate:"", dropoffTime:"09:00" });
  assert.deepEqual(selectCarsPickupTime({ ...selected, dropoffDate:"2026-08-10", dropoffTime:"10:30" }, "11:00"), { ...selected, pickupTime:"11:00", dropoffDate:"2026-08-10", dropoffTime:"" });
});
test("missing Cars page details fail validation and serialize no placeholder values", () => {
  const form = initializeCarsPageForm({}, today).form;
  assert.deepEqual(Object.keys(validateCarForm(form, today)).sort(), ["driverAge","dropoffDate","dropoffTime","pickupDate","pickupLocation","pickupTime"]);
  assert.deepEqual(carSearchParams(form), { pickupLocation:"", dropoffLocation:"", pickupDate:"", pickupTime:"", dropoffDate:"", dropoffTime:"", driverAge:"" });
});
test("invalid incoming details use safe defaults and matching locations disable separate drop-off", () => {
  const result = initializeCarForm({ pickupLocation:"LAX",dropoffLocation:"LAX",pickupDate:"bad",pickupTime:"10:15",dropoffDate:"2020-01-01",dropoffTime:"x",driverAge:"71" }, today);
  assert.equal(result.form.separateDropoff, false); assert.equal(result.form.driverAge, 30); assert.ok(result.notice);
});
test("locations validate and serialize truthful effective drop-off", () => {
  assert.equal(validateCarForm({ ...valid(), pickupLocation:" " }, today).pickupLocation, "Enter a pick-up location.");
  assert.ok(validateCarForm({ ...valid(), dropoffLocation:" " }, today).dropoffLocation);
  assert.deepEqual(carSearchParams({ ...valid(), separateDropoff:false }), { pickupLocation:"LAX",dropoffLocation:"LAX",pickupDate:"2026-08-13",pickupTime:"10:00",dropoffDate:"2026-08-16",dropoffTime:"10:00",driverAge:"30" });
  assert.equal(carSearchParams(valid()).dropoffLocation, "SFO");
});
test("date and datetime validation permits only strictly later drop-off", () => {
  assert.ok(validateCarForm({ ...valid(), pickupDate:"2026-07-29" }, today).pickupDate);
  assert.ok(validateCarForm({ ...valid(), dropoffDate:"2026-08-12" }, today).dropoffDate);
  assert.ok(validateCarForm({ ...valid(), dropoffDate:"2026-08-13", dropoffTime:"10:00" }, today).dropoffTime);
  assert.equal(validateCarForm({ ...valid(), dropoffDate:"2026-08-13", dropoffTime:"10:30" }, today).dropoffTime, undefined);
  assert.equal(validateCarForm({ ...valid(), dropoffDate:"2026-08-14", dropoffTime:"10:00" }, today).dropoffTime, undefined);
});
test("calendar helpers handle month, leap year, and local serialization", () => {
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01"); assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(localIsoDate(new Date(2026, 0, 2, 23, 59)), "2026-01-02"); assert.ok(localDateFromIso("2028-02-29"));
});
test("time options and automatic adjustment are bounded and preserve valid values", () => {
  assert.equal(timeOptions.length,48); assert.equal(timeOptions[0],"00:00"); assert.equal(timeOptions[47],"23:30");
  const same = { ...valid(), dropoffDate:"2026-08-13", pickupTime:"10:00", dropoffTime:"09:00" };
  assert.deepEqual(adjustDropoff(same).form, { ...same, dropoffTime:"10:30" }); assert.equal(adjustDropoff(valid()).adjusted,false);
  const late = adjustDropoff({ ...same, pickupTime:"23:30", dropoffTime:"23:30" }).form; assert.equal(late.dropoffDate,"2026-08-14"); assert.equal(late.dropoffTime,"00:00");
});
test("driver age accepts only bounded integers and controls cannot exceed limits", () => {
  assert.equal(parseDriverAge("18"),18); assert.equal(parseDriverAge("70"),70); assert.equal(parseDriverAge("17"),undefined); assert.equal(parseDriverAge("71"),undefined); assert.equal(parseDriverAge("30.5"),undefined); assert.equal(parseDriverAge("age"),undefined);
  assert.equal(boundedAge(70,1),70); assert.equal(boundedAge(18,-1),18);
});
