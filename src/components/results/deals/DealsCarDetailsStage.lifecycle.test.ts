import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./DealsCarDetailsStage.tsx", import.meta.url), "utf8");
const inventoryEffect = source.slice(source.indexOf('fetch("/api/cars/search"'));
const effectDependencies = inventoryEffect.match(/\}, \[([^\]]+)\]\);/)?.[1] ?? "";

test("source contract keeps guided Car details request identity canonical", () => {
  assert.match(source, /const carRequestIdentity = buildDealsCarRequestIdentity\(search\);/);
  assert.match(source, /const carRequestPayload = buildDealsCarRequestPayload\(search\);/);
  assert.match(source, /const payloadJson = JSON\.stringify\(carRequestPayload\);/);
  assert.match(source, /const requestIdentity = `\$\{carRequestIdentity\}::\$\{effectiveCarId \?\? ""\}`;/);
});

test("source contract removes raw search from inventory effect dependencies", () => {
  assert.equal(effectDependencies.replace(/\s/g, ""), "effectiveCarId,payloadJson,requestIdentity,retryGeneration");
  for (const forbidden of ["search", "plan", "confirming", "confirmationError", "car", "resultReceivedAt", "dictionary", "t"]) {
    assert.doesNotMatch(effectDependencies, new RegExp(`\\b${forbidden}\\b`));
  }
});

test("source contract installs accepted response with one timestamp", () => {
  assert.equal(source.match(/const receivedAt = Date\.now\(\);/g)?.length, 1);
  assert.match(source, /resultReceivedAt: receivedAt/);
  assert.match(source, /setResultReceivedAt\(receivedAt\)/);
  assert.doesNotMatch(source, /resultReceivedAt: Date\.now\(\)/);
});
