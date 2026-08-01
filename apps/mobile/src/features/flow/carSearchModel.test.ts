import assert from "node:assert/strict";
import test from "node:test";
import { adjustDropoff, boundedAge, carSearchParams, defaultCarForm, initializeCarForm, parseDriverAge, timeOptions, validateCarForm } from "./carSearchModel";
import { addCalendarDays, localDateFromIso, localIsoDate } from "./localDateModel";
const today = new Date(2026, 6, 30, 23, 30);
const valid = () => ({ ...defaultCarForm(today), pickupLocation: " LAX ", separateDropoff: true, dropoffLocation: " SFO " });

test("empty and array parameters initialize once with local safe defaults", () => {
  const empty = initializeCarForm({}, today).form;
  assert.equal(empty.pickupDate, "2026-08-13"); assert.equal(empty.dropoffDate, "2026-08-16"); assert.equal(empty.driverAge, 30);
  const array = initializeCarForm({ pickupLocation: ["LAX", "ignored"], dropoffLocation: ["SFO"], pickupDate: ["2026-08-10"], pickupTime: ["09:30"], dropoffDate: ["2026-08-11"], dropoffTime: ["10:00"], driverAge: ["35"] }, new Date(2026, 6, 1)).form;
  assert.deepEqual(array, { pickupLocation:"LAX",dropoffLocation:"SFO",separateDropoff:true,pickupDate:"2026-08-10",pickupTime:"09:30",dropoffDate:"2026-08-11",dropoffTime:"10:00",driverAge:35 });
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
