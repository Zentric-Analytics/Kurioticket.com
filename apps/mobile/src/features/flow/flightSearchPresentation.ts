import type { FlightForm } from "./flightSearchModel";

const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

export function formatTravelerCabinSummary(form: Pick<FlightForm, "adults" | "children" | "infants" | "cabin">) {
  const travelers = [
    form.adults ? plural(form.adults, "adult") : undefined,
    form.children ? plural(form.children, "child", "children") : undefined,
    form.infants ? plural(form.infants, "infant") : undefined,
  ].filter(Boolean).join(", ");
  return `${travelers || "Select travelers"}, ${form.cabin ?? "Select cabin"}`;
}
