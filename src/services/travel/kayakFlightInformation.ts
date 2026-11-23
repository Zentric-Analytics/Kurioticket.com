import type { FlightAirlineBaggagePolicy, FlightCabinDetails, FlightFareTerm, FlightOnboardFeature, FlightOptionalService, FlightProviderCondition, FlightProviderDetails } from "@/lib/types";
import { kayakAttributes, type KayakAttribute } from "./kayakPresentation";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
/** Provider descriptions are escaped by React; transport/credential-bearing text is not presentation data. */
export function sanitizeKayakFlightText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean && clean.length <= 1200 && !/https?:\/\/|api[-_\s]?key|(?:access|secret|auth|refresh)[-_\s]?token|authorization|\b(?:password|credential|token|cookie)\s*[:=]|\bbearer\s+[\w.-]+/i.test(clean) ? clean : undefined;
}
const description = sanitizeKayakFlightText;
function unmapped(value: RecordValue, keys: string[]) { return kayakAttributes(value, keys).filter(fact => description(fact.value)); }
function display(value: unknown) {
  const source = object(value);
  return description(typeof value === "string" ? value : source.displayName ?? source.description ?? source.name);
}
function money(value: unknown, fallbackCurrency: string) {
  const source = object(value);
  const amount = typeof value === "number" ? value : source.price ?? source.amount;
  const currency = source.currency ?? source.currencyCode ?? fallbackCurrency;
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
    ? { amount, currency } : undefined;
}
const knownQualityKinds: Record<string, FlightOnboardFeature["kind"]> = {
  seat: "seat", power: "power", powerNegative: "power", entertainment: "entertainment", food: "meal", wifi: "wifi", redEye: "overnight",
};
function requiresFee(source: RecordValue, text: string) {
  if (source.hasFee === true || source.requiresFee === true || source.paid === true) return true;
  if (/\b(?:no|without)\s+(?:additional\s+)?(?:fee|charge)\b|\bfree of charge\b/i.test(text)) return false;
  return /\(fee\)|\b(?:available for a fee|additional fee|additional charge|paid)\b/i.test(text);
}
function quantity(value: unknown) { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined; }
function serviceMetadata(source: RecordValue, fallbackContext?: string) {
  const maximumQuantity = quantity(source.maximumQuantity), travelerCount = quantity(source.travelerCount);
  const journeyContext = description(source.journeyContext) ?? fallbackContext;
  return {
    ...(maximumQuantity !== undefined ? { maximumQuantity } : {}),
    ...(travelerCount !== undefined ? { travelerCount } : {}),
    ...(journeyContext ? { journeyContext } : {}),
    ...(source.pricedPerTraveler === true ? { pricedPerTraveler: true } : {}),
  };
}


export type KayakFlightInformation = {
  fareFamily?: string;
  cabin?: string;
  segments: Record<string, { aircraft?: { name: string }; duration?: string; cabinDetails?: FlightCabinDetails }>;
  fareTerms: FlightFareTerm[];
  conditions: FlightProviderCondition[];
  optionalServices: FlightOptionalService[];
  airlineBaggagePolicies: FlightAirlineBaggagePolicy[];
  price?: FlightProviderDetails["price"];
  unmappedFacts: KayakAttribute[];
};

/** Interpret structured KAYAK semantics once. Unknown fields are never passenger UI. */
export function normalizeKayakFlightInformation(data: RecordValue, result: RecordValue, option: RecordValue, currency: string): KayakFlightInformation {
  const info: KayakFlightInformation = { segments: {}, fareTerms: [], conditions: [], optionalServices: [], airlineBaggagePolicies: [], unmappedFacts: [] };
  info.fareFamily = display(option.fareFamily);
  const knownOptionKeys = new Set(["type", "providerCode", "displayPrice", "bookingUrl", "fareFamily", "fees", "conditions", "optionalServices", "segmentFares", "badges", "basePrice", "totalPrice", "taxes", "price"]);
  info.unmappedFacts.push(...unmapped(option, Object.keys(option).filter(key => !knownOptionKeys.has(key))));
  const fees = object(option.fees);
  for (const [key, label] of [["carryOnBag", "carry-on"], ["checkedBag", "checked bag"]] as const) {
    for (const raw of list(fees[key])) {
      const bag = object(raw);
      const ordinal = new Map([["first", "1"], ["second", "second"], ["third", "third"]]).get(String(bag.bagNumber)) ?? "";
      const subject = `${ordinal ? `${ordinal} ` : ""}${label}`;
      const charge = money(bag.price ?? bag.fee ?? bag.amount, currency);
      const restriction = typeof bag.restriction === "string" ? bag.restriction : "";
      if (restriction === "included") info.fareTerms.push({ category: "baggage", semantic: "positive", text: `${subject} included` });
      else if (["notAllowed", "not-allowed"].includes(restriction)) info.fareTerms.push({ category: "baggage", semantic: "negative", text: `${subject} not allowed` });
      else if (["notIncluded", "not-included", "excluded"].includes(restriction)) info.fareTerms.push({ category: "baggage", semantic: "negative", text: charge ? `${subject} not included · ${charge.currency} ${charge.amount.toFixed(2)}` : `${subject} not included` });
      else if (["fee", "charge", "availableForFee"].includes(restriction) && charge) info.fareTerms.push({ category: "baggage", semantic: "informational", text: `${subject} available for ${charge.currency} ${charge.amount.toFixed(2)}` });
      else {
        info.fareTerms.push({ category: "baggage", semantic: "informational", text: `${label === "carry-on" ? "Carry-on" : "Checked bag"} allowance not supplied by provider` });
        info.unmappedFacts.push(...unmapped(bag, Object.keys(bag)));
      }
    }
  }
  for (const category of ["change", "refund"] as const) {
    const source = object(object(option.conditions)[category]);
    if (!Object.keys(source).length) continue;
    const restriction = source.restriction ?? source.state;
    const state = ["allowed", "included"].includes(String(restriction)) ? "allowed" : ["notAllowed", "not-allowed", "excluded"].includes(String(restriction)) ? "not-allowed" : "unknown";
    const penalty = money(source.penalty ?? source.fee, currency);
    info.conditions.push({ category, scope: "trip", state, ...(penalty ? { penaltyAmount: penalty.amount, penaltyCurrency: penalty.currency } : {}) });
  }
  for (const raw of list(option.optionalServices)) {
    const source = object(raw), text = display(source);
    const price = money(source.price, currency);
    if (!text || source.optional !== true || (!price && !requiresFee(source, text))) {
      info.unmappedFacts.push(...unmapped(source, Object.keys(source))); continue;
    }
    const common = { type: description(source.type) ?? "service", description: text, ...serviceMetadata(source) };
    info.optionalServices.push(price ? { ...common, price: price.amount, currency: price.currency } : { ...common, pricing: "fee-unspecified" });
  }
  const fares = list(option.segmentFares).map(object);
  const cabinNames: Array<string | undefined> = [];
  const seenCarriers = new Set<string>();
  for (const reference of list(result.legs)) {
    const leg = object(object(data.legs)[String(object(reference).id)]);
    for (const segmentReference of list(leg.segments)) {
      const id = object(segmentReference).id;
      if (typeof id !== "string") continue;
      const segment = object(object(data.segments)[id]);
      const matches = fares.filter(fare => fare.segmentId === id);
      const fare = matches.length === 1 ? matches[0] : {};
      const cabin = description(object(fare.cabin).displayName);
      cabinNames.push(cabin);
      const onboardFeatures: FlightOnboardFeature[] = [];
      const airlineCode = typeof segment.airline === "string" ? segment.airline : "";
      const context = [description(segment.origin) && description(segment.destination) ? `${segment.origin} → ${segment.destination}` : undefined, [description(airlineCode), description(segment.flightNumber)].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
      for (const raw of list(fare.qualityItems)) {
        const source = object(raw);
        const code = typeof (source.code ?? source.semantic) === "string" ? String(source.code ?? source.semantic) : "";
        const kind = Object.hasOwn(knownQualityKinds, code) ? knownQualityKinds[code] : undefined;
        const text = display(source);
        if (!kind || !text) { info.unmappedFacts.push(...unmapped(source, Object.keys(source))); continue; }
        const price = money(source.price ?? source.fee, currency);
        if (requiresFee(source, text) || (price && price.amount > 0)) {
          const service = { type: kind, description: text, ...serviceMetadata(source, context || undefined) };
          info.optionalServices.push(price ? { ...service, price: price.amount, currency: price.currency } : { ...service, pricing: "fee-unspecified" });
        } else if (!onboardFeatures.some(feature => feature.kind === kind && feature.description === text)) onboardFeatures.push({ kind, description: text });
      }
      const aircraft = description(segment.equipmentTypeName);
      const duration = typeof segment.duration === "number" && Number.isFinite(segment.duration) && segment.duration >= 0 ? `PT${segment.duration}M` : undefined;
      info.segments[id] = {
        ...(aircraft ? { aircraft: { name: aircraft } } : {}), ...(duration ? { duration } : {}),
        ...(cabin || info.fareFamily || onboardFeatures.length ? { cabinDetails: {
          ...(cabin ? { cabinClass: cabin } : {}), ...(info.fareFamily ? { fareBrandName: info.fareFamily } : {}), ...(onboardFeatures.length ? { onboardFeatures } : {}),
        } } : {}),
      };
      if (!airlineCode || seenCarriers.has(airlineCode)) continue;
      seenCarriers.add(airlineCode);
      const airline = object(object(data.airlines)[airlineCode]);
      const carrierName = description(airline.displayName) ?? (/^[A-Z0-9]{2,3}$/.test(airlineCode) ? airlineCode : undefined);
      if (!carrierName) continue;
      const carryOn: string[] = [], checked: string[] = [];
      for (const rawPolicy of list(airline.baggagePolicies)) {
        const policy = object(rawPolicy);
        const bagType = policy.bagType ?? policy.type;
        const destination = ["carryOn", "carryOnBag", "carry-on"].includes(String(bagType)) ? carryOn : ["checked", "checkedBag", "checked-bag"].includes(String(bagType)) ? checked : undefined;
        const texts = [display(policy), ...list(policy.restrictions).map(value => display(value))].filter((text): text is string => Boolean(text));
        if (!destination || !texts.length) { info.unmappedFacts.push(...unmapped(policy, Object.keys(policy))); continue; }
        for (const text of texts) if (!destination.includes(text)) destination.push(text);
      }
      if (carryOn.length || checked.length) info.airlineBaggagePolicies.push({ carrierName, ...(/^[A-Z0-9]{2,3}$/.test(airlineCode) ? { carrierCode: airlineCode } : {}), ...(carryOn.length ? { carryOn } : {}), ...(checked.length ? { checked } : {}) });
    }
  }
  if (cabinNames.length && cabinNames.every(Boolean)) info.cabin = [...new Set(cabinNames)].join(" / ");
  // Same-scope total must match the verified displayed amount before accepting a breakdown.
  const total = money(option.totalPrice ?? fees.totalPrice, currency);
  const base = money(option.basePrice ?? fees.basePrice, currency);
  const tax = money(option.taxes ?? fees.taxes, currency);
  const displayed = money(option.displayPrice, currency);
  if (total && displayed && total.currency === displayed.currency && total.amount === displayed.amount && ["total", "perPerson"].includes(String(data.priceMode))) {
    info.price = { totalAmount: total.amount, totalCurrency: total.currency,
      ...(base && base.currency === total.currency && base.amount <= total.amount ? { baseAmount: base.amount, baseCurrency: base.currency } : {}),
      ...(tax && tax.currency === total.currency && tax.amount <= total.amount ? { taxAmount: tax.amount, taxCurrency: tax.currency } : {}),
    };
  }
  return info;
}
