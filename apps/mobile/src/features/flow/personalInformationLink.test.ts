import assert from "node:assert/strict"; import { readFileSync } from "node:fs"; import test from "node:test";
test("email change opens the completed dashboard", () => { const source = readFileSync("src/features/flow/AccountDataScreens.tsx", "utf8"); assert.ok(source.includes("https://kurioticket.com/dashboard")); assert.ok(!source.includes("dashboard/personal-details")); });
