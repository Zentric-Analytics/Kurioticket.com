import assert from "node:assert/strict";
import test from "node:test";

import { formatBaggageValue, formatDesktopBaggageValue } from "./flightCardBaggage";

const t = (key: string) =>
  ({
    carryOnIncluded: "Carry-on included",
    checkProvider: "Check provider",
    notSuppliedByProvider: "Not provided",
    seeDetails: "See details",
    "flightCard.compactBagSingular": "bag",
    "flightCard.compactBagPlural": "bags",
  })[key] ?? key;

test("desktop baggage fallback uses compact localized result-card copy", () => {
  assert.equal(
    formatBaggageValue("Baggage details not supplied by the provider", t),
    "Not provided",
  );
  assert.equal(
    formatBaggageValue("  BAGGAGE DETAILS NOT SUPPLIED BY THE PROVIDER  ", t),
    "Not provided",
  );
});

test("desktop baggage formatter preserves real allowances and existing fallbacks", () => {
  assert.equal(formatBaggageValue("1 checked bag up to 23 kg", t), "1 checked bag up to 23 kg");
  assert.equal(formatBaggageValue("Carry-on included", t), "Carry-on included");
  assert.equal(formatBaggageValue("Rules reviewed on the external provider", t), "Check provider");
});


test("desktop baggage fallback uses the active locale dictionary", () => {
  const localized = (key: string) =>
    ({
      carryOnIncluded: "Equipaje de mano incluido",
      checkProvider: "Consultar proveedor",
      notSuppliedByProvider: "No proporcionado por el proveedor",
    })[key] ?? key;

  assert.equal(
    formatBaggageValue("Baggage details not supplied by the provider", localized),
    "No proporcionado por el proveedor",
  );
});


test("desktop baggage card compacts provider fallback and checked-bag allowance", () => {
  assert.equal(
    formatDesktopBaggageValue("Baggage allowance not supplied by provider", t),
    "Not provided",
  );
  assert.equal(
    formatDesktopBaggageValue("1 checked bag up to 23 kg", t),
    "1 bag · 23 kg",
  );
  assert.equal(
    formatDesktopBaggageValue("2 checked bags up to 20 kg", t),
    "2 bags · 20 kg",
  );
});

test("desktop baggage card shortens supplied-details copy", () => {
  assert.equal(
    formatDesktopBaggageValue("See supplied baggage details", t),
    "See details",
  );
  assert.equal(
    formatDesktopBaggageValue("Carry-on included", t),
    "Carry-on included",
  );
});

test("desktop baggage compact copy stays localized", () => {
  const localized = (key: string) =>
    ({
      carryOnIncluded: "Equipaje de mano incluido",
      checkProvider: "Consultar proveedor",
      notSuppliedByProvider: "No proporcionado por el proveedor",
      seeDetails: "Ver detalles",
    })[key] ?? key;

  assert.equal(
    formatDesktopBaggageValue("See supplied baggage details", localized),
    "Ver detalles",
  );
});
