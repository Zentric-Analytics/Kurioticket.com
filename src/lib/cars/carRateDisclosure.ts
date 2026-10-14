import type { CarOffer } from "./types";
import { formatCarSupplierFacts } from "./supplierFacts";

export type CarRateDisclosureSection = {
  id: "payment" | "policies" | "pickup" | "vehicle" | "other";
  title: string;
  facts: Array<{ label: string; value: string }>;
};

const sectionDefinitions: Array<Pick<CarRateDisclosureSection, "id" | "title">> = [
  { id: "payment", title: "Payment and pricing" },
  { id: "policies", title: "Cancellation and rental policies" },
  { id: "pickup", title: "Pickup and return" },
  { id: "vehicle", title: "Vehicle and requirements" },
  { id: "other", title: "Additional supplier information" },
];

const sectionIdFor = (label: string): CarRateDisclosureSection["id"] => {
  const normalized = label.toLowerCase();
  if (/^(pickup|drop-off|rental agency)( · |$)/.test(normalized)) return "pickup";
  if (/^(fees|payment type|rate type|is credit card required|credit card required)/.test(normalized)) return "payment";
  if (/^(policy|badges)( · |$)/.test(normalized) || /cancellation|mileage|fuel/.test(normalized)) return "policies";
  if (/^(car|doors|bags|passengers|transmission|brand|sipp|features)( · |$)/.test(normalized)) return "vehicle";
  return "other";
};

/** Present every sanitized provider fact for exactly one offer; do not infer unavailable terms. */
export function getCarRateDisclosureSections(offer: Pick<CarOffer, "suppliedFacts">): CarRateDisclosureSection[] {
  const sections = sectionDefinitions.map(section => ({ ...section, facts: [] as Array<{ label: string; value: string }> }));
  for (const fact of formatCarSupplierFacts(offer.suppliedFacts) ?? []) {
    const section = sections.find(section => section.id === sectionIdFor(fact.label));
    section?.facts.push(fact);
  }
  return sections.filter(section => section.facts.length > 0);
}

export function getCarRatePaymentLabel(offer: Pick<CarOffer, "suppliedFacts" | "payAtPickup">): string | null {
  const payment = offer.suppliedFacts?.find(fact => fact.label.toLowerCase() === "payment type")?.value;
  if (payment === "prepay") return "Pay now";
  if (payment === "payAtPickup") return "Pay at pickup";
  if (payment === "deposit") return "Deposit payment";
  if (offer.payAtPickup) return "Pay at pickup";
  return null;
}
