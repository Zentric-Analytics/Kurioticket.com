import type { CarOffer } from "./types";

export type CarRateDisclosureSection = {
  id: "payment" | "policies" | "pickup" | "driver" | "vehicle" | "other";
  title: string;
  facts: Array<{ label: string; value: string }>;
};

type SupplierOffer = Pick<CarOffer, "suppliedFacts"> & Partial<Pick<CarOffer, "currency">>;

const sectionDefinitions: Array<Pick<CarRateDisclosureSection, "id" | "title">> = [
  { id: "payment", title: "Price and payment" },
  { id: "policies", title: "Cancellation and rental policies" },
  { id: "pickup", title: "Pickup and return" },
  { id: "driver", title: "Driver requirements" },
  { id: "vehicle", title: "Vehicle details" },
  { id: "other", title: "Additional supplier information" },
];

/** KAYAK's adapter flattens selected nested provider fields using ' · '. */
const pathFor = (label: string) =>
  label.split(/\s*·\s*/).map(part => part.toLowerCase().replace(/[^a-z0-9]/g, "")).join(".");

function supplierFields(offer: SupplierOffer): Map<string, string> {
  const fields = new Map<string, string>();
  for (const fact of offer.suppliedFacts ?? []) {
    const path = pathFor(fact.label);
    const value = fact.value.trim();
    if (path && value && !fields.has(path)) fields.set(path, value);
  }
  return fields;
}

const truth = (value: string | undefined): boolean | undefined =>
  /^(yes|true)$/i.test(value ?? "") ? true : /^(no|false)$/i.test(value ?? "") ? false : undefined;

const numeric = (value: string | undefined): number | undefined => {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function sourceMoney(fields: Map<string, string>, prefix: string, currency?: string): string | null {
  // Prefer KAYAK's supplied display-price string, without guessing a currency.
  const displayed = fields.get(prefix + ".displayprice");
  if (displayed && displayed.length <= 48 && /\d/.test(displayed) &&
    !/[<>]|https?:\/\/|(?:api|access)[-_]?key/i.test(displayed)) return displayed;
  const amount = numeric(fields.get(prefix + ".price"));
  if (amount === undefined || !currency || !/^[A-Z]{3}$/.test(currency)) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return null;
  }
}

/**
 * Explicit customer-facing projection of KAYAK's sandbox fields. Leave the raw
 * supplier attributes unchanged on the offer. Never expose schema paths, IDs,
 * unknown enums or imagined prices, driver requirements or cancellation rights.
 */
export function getCarRateDisclosureSections(offer: SupplierOffer): CarRateDisclosureSection[] {
  const fields = supplierFields(offer);
  const sections = sectionDefinitions.map(section => ({
    ...section, facts: [] as CarRateDisclosureSection["facts"],
  }));
  const add = (id: CarRateDisclosureSection["id"], label: string, value: string | null | undefined) => {
    if (!value?.trim()) return;
    const section = sections.find(section => section.id === id);
    if (section && !section.facts.some(fact => fact.label === label)) {
      section.facts.push({ label, value: value.trim() });
    }
  };
  const get = (key: string) => fields.get(key);

  // Each fee is associated with its own provider code, price and total-inclusion
  // flag. An unknown fee code never becomes a customer-facing label.
  const feeLabels: Record<string, string> = {
    securitydeposit: "Security deposit",
    youngdriver: "Young-driver fee",
    seniordriver: "Senior-driver fee",
    dropoff: "Drop-off fee",
    afterhours: "After-hours fee",
    deliveryfee: "Delivery fee",
  };
  const feeIndexes = [...new Set([...fields.keys()].flatMap(key => {
    const match = /^fees([1-9]\d*)\./.exec(key);
    return match ? [Number(match[1])] : [];
  }))].sort((a, b) => a - b);
  for (const index of feeIndexes) {
    const prefix = "fees" + index;
    const code = get(prefix + ".code")?.toLowerCase();
    const label = code ? feeLabels[code] : undefined;
    if (!label) continue;
    const amount = sourceMoney(fields, prefix + ".rate", offer.currency);
    const included = truth(get(prefix + ".isincludedintotal"));
    const inclusion = included === true ? " · Included in estimated total"
      : included === false ? " · Not included in estimated total" : "";
    add("payment", label, (amount ?? "Amount not supplied") + inclusion);
  }

  // Badge flags and cancellation rules can disagree within one sandbox offer.
  // The provider-listed fee has an unknown trigger; never promise unconditional
  // free cancellation or invent a deadline from a raw 'limitHours' field.
  const badgesAdvertiseFree = [...fields.entries()].some(([key, value]) =>
    /^badges[1-9]\d*\.code$/.test(key) && value.toLowerCase() === "freecancellation");
  const unlimited = truth(get("policy.cancellation.isunlimited"));
  const policyFee = sourceMoney(fields, "policy.cancellation.noncancellationfee", offer.currency);
  const policyFeeNumeric = numeric(get("policy.cancellation.noncancellationfee.price"));
  const feePossiblyPositive = policyFeeNumeric !== undefined ? policyFeeNumeric > 0
    : Boolean(policyFee && /[1-9]/.test(policyFee));
  const hasCancellationFields = [...fields.keys()].some(key => key.startsWith("policy.cancellation."));
  if (badgesAdvertiseFree && (unlimited === false || feePossiblyPositive)) {
    add("policies", "Cancellation", "Free cancellation advertised; conditions and fees may apply");
  } else if (badgesAdvertiseFree) {
    add("policies", "Cancellation", "Free cancellation advertised; check provider conditions");
  } else if (unlimited === false) {
    add("policies", "Cancellation", "Restrictions apply; confirm provider conditions");
  } else if (hasCancellationFields) {
    add("policies", "Cancellation", "Check provider conditions");
  }
  if (feePossiblyPositive && policyFee) {
    add("policies", "Provider-listed policy fee", policyFee + " · Check when it applies");
  }
  const mileage = get("policy.mileage.code")?.toLowerCase();
  if (mileage === "unlimited") add("policies", "Mileage", "Unlimited mileage");
  if (mileage === "limited") add("policies", "Mileage", "Limited mileage; allowance not supplied");
  const fuel = get("policy.fuel.code")?.toLowerCase();
  if (fuel === "fulltofull") add("policies", "Fuel return policy", "Full to full");
  if (fuel === "sametosame") add("policies", "Fuel return policy", "Same level as collected");

  add("pickup", "Rental agency", get("rentalagency.displayname"));
  const location = (prefix: "pickup" | "dropoff") =>
    get(prefix + ".address") || [get(prefix + ".cityname"), get(prefix + ".countrycode")].filter(Boolean).join(", ");
  add("pickup", "Pickup location", location("pickup"));
  add("pickup", "Return location", location("dropoff"));
  const pickupMethod: Record<string, string> = {
    interminal: "Airport counter",
    shuttle: "Shuttle pickup",
    nonairport: "Off-airport location",
    callforpickup: "Call for pickup",
  };
  add("pickup", "Pickup method", pickupMethod[get("pickup.locationtype")?.toLowerCase() ?? ""]);
  const airport = (prefix: "pickup" | "dropoff") => {
    const name = get(prefix + ".airport.displayname");
    const code = get(prefix + ".airport.code");
    return name && code ? name + " (" + code + ")" : name || code;
  };
  add("pickup", "Pickup airport", airport("pickup"));
  add("pickup", "Return airport", airport("dropoff"));

  const cardRequired = truth(get("iscreditcardrequired"));
  if (cardRequired !== undefined) {
    add("driver", "Credit card required", cardRequired ? "Yes" : "No");
  }

  add("vehicle", "Vehicle class", get("type.displayname"));
  add("vehicle", "Vehicle description", get("brand"));
  const passengers = numeric(get("passengers"));
  if (passengers !== undefined && Number.isInteger(passengers)) add("vehicle", "Passengers", String(passengers));
  const bags = numeric(get("bags"));
  if (bags !== undefined && Number.isInteger(bags)) add("vehicle", "Bags", String(bags));
  const doors = get("doors");
  if (doors && /^doors\d+$/.test(doors)) {
    add("vehicle", "Doors", doors.slice(5).split("").join(" or "));
  } else {
    const doorCount = numeric(doors);
    if (doorCount !== undefined && Number.isInteger(doorCount)) add("vehicle", "Doors", String(doorCount));
  }
  const transmission = get("transmission")?.toLowerCase();
  if (transmission === "automatic" || transmission === "manual") {
    add("vehicle", "Transmission", transmission === "automatic" ? "Automatic" : "Manual");
  }
  const fuelType: Record<string, string> = {
    petrol: "Petrol", gasoline: "Petrol", diesel: "Diesel",
    electric: "Electric", hybrid: "Hybrid",
  };
  add("vehicle", "Fuel type", fuelType[get("fuel")?.toLowerCase() ?? ""]);
  const features = [...fields.entries()].filter(([key]) =>
    /^features[1-9]\d*\.displayname$/.test(key)).map(([, value]) => value);
  if (features.length) add("vehicle", "Features", [...new Set(features)].join(" · "));

  return sections.filter(section => section.facts.length > 0);
}

/** Explicit payment enum, or an explicitly provider-derived pay-at-pickup flag. */
export function getCarRatePaymentLabel(offer: Pick<CarOffer, "suppliedFacts" | "payAtPickup">): string | null {
  const payment = supplierFields(offer).get("paymenttype");
  if (payment === "prepay") return "Pay now";
  if (payment === "payAtPickup") return "Pay at pickup";
  if (payment === "deposit") return "Deposit payment";
  if (offer.payAtPickup) return "Pay at pickup";
  return null;
}
