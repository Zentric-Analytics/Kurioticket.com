import assert from "node:assert/strict";
import test from "node:test";
import { createSavedItemInputSchema, savedItemTypes } from "@/services/savedRecentService";

const car = {
  type: "car", resultId: "car-1", provider: "Provider", modelName: "Toyota Corolla", categoryLabel: "Compact",
  pickupLocation: "Lagos Airport", dropoffLocation: "Lagos Airport", pickupDate: "2027-01-01", pickupTime: "10:00",
  dropoffDate: "2027-01-03", dropoffTime: "10:00", driverAge: 30, totalPrice: 120, currency: "usd", payload: {},
} as const;

test("saved Cars are a first-class account item with complete reopen context", () => {
  const parsed = createSavedItemInputSchema.safeParse(car);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.currency, "USD");
  assert.equal(savedItemTypes.includes("car"), true);
});

test("saved Cars reject missing search context instead of inventing it", () => {
  const incomplete: Partial<typeof car> = { ...car };
  Reflect.deleteProperty(incomplete, "driverAge");
  assert.equal(createSavedItemInputSchema.safeParse(incomplete).success, false);
});

test("saved Cars preserve distinct canonical any-age and explicit age values", () => {
  const anyAge = createSavedItemInputSchema.parse({ ...car, driverAge: "18-70" });
  const explicit = createSavedItemInputSchema.parse({ ...car, driverAge: 18 });
  assert.equal(anyAge.type === "car" && anyAge.driverAge, "18-70");
  assert.equal(explicit.type === "car" && explicit.driverAge, "18");
});
