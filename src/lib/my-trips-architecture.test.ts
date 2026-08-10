import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

test("active architecture preserves the permanent metasearch My Trips boundary", () => {
  const root = process.cwd();
  const activeFiles = ["prisma/schema.prisma", "src/services/myTripService.ts", "src/app/api/dashboard/trips/route.ts", "src/app/api/mobile/v1/trips/route.ts", "src/lib/adminNavigation.ts", "docs/architecture/four-travel-systems.md"];
  const source = activeFiles.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
  for (const forbidden of ["TripBooking", "tripBookingService", "/admin/bookings", "dashboard/trips/lookup", "if and when direct booking is supported"]) assert.equal(source.includes(forbidden), false, forbidden);
  for (const removed of ["src/services/tripBookingService.ts", "src/app/admin/bookings/page.tsx", "src/app/api/dashboard/trips/lookup/route.ts", "src/app/api/mobile/v1/trips/[id]/route.ts"]) assert.equal(existsSync(join(root, removed)), false, removed);
  assert.match(source, /Kurioticket is a metasearch and referral platform/);
});
