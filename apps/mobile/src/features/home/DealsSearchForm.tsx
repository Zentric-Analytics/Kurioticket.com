import { useState } from "react";
import { Text, View } from "react-native";
import { CounterSheet, FormTextField, OptionSegment, ReadonlyField, SearchSubmitButton } from "./SearchFormControls";
import { searchFormStyles as styles } from "./searchFormStyles";
import { addDays, isIsoDate, sleep, todayIso } from "./searchUtils";

type DealCategory = "all" | "flights" | "hotels" | "packages";
type DealsSearchValues = { origin: string; destination: string; departureDate: string; flexibleDates: boolean; travelers: number; category: DealCategory };
type DealsErrors = Partial<Record<keyof DealsSearchValues, string>>;
const categories = [{ value: "all", label: "All" }, { value: "flights", label: "Flights" }, { value: "hotels", label: "Hotels" }, { value: "packages", label: "Packages" }] as const;

export function DealsSearchForm() {
  const [values, setValues] = useState<DealsSearchValues>({ origin: "", destination: "Anywhere", departureDate: addDays(21), flexibleDates: true, travelers: 1, category: "all" });
  const [errors, setErrors] = useState<DealsErrors>({});
  const [showTravelers, setShowTravelers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const validate = () => { const next: DealsErrors = {}; if ((values.category === "all" || values.category === "flights" || values.category === "packages") && !values.origin.trim()) next.origin = "Enter an origin for flight-inclusive deals."; if (!values.destination.trim()) next.destination = "Enter a destination or Anywhere."; if (!values.flexibleDates && (!isIsoDate(values.departureDate) || values.departureDate < todayIso())) next.departureDate = "Use a future YYYY-MM-DD date."; if (!Number.isInteger(values.travelers) || values.travelers < 1) next.travelers = "Choose at least 1 traveler."; if (!values.category) next.category = "Choose a deal category."; setErrors(next); return Object.keys(next).length === 0; };
  const submit = async () => { if (submitting || !validate()) return; setSubmitting(true); setMessage(""); await sleep(300); setSubmitting(false); setMessage("Travel deal results are not available yet."); };
  return <View style={styles.card}><OptionSegment value={values.category} options={categories} onChange={(category) => setValues({ ...values, category })} /><FormTextField label="Origin" value={values.origin} placeholder="City or airport" onChangeText={(origin) => setValues({ ...values, origin })} error={errors.origin} /><FormTextField label="Destination" value={values.destination} placeholder="Anywhere" onChangeText={(destination) => setValues({ ...values, destination })} error={errors.destination} /><OptionSegment value={values.flexibleDates ? "flexible" : "date"} options={[{ value: "flexible", label: "Flexible dates" }, { value: "date", label: "Set date" }] as const} onChange={(mode) => setValues({ ...values, flexibleDates: mode === "flexible" })} />{values.flexibleDates ? null : <FormTextField label="Departure" value={values.departureDate} placeholder="YYYY-MM-DD" onChangeText={(departureDate) => setValues({ ...values, departureDate })} error={errors.departureDate} />}<ReadonlyField label="Travelers" value={`${values.travelers} traveler${values.travelers === 1 ? "" : "s"}`} meta="Adults and children" onPress={() => setShowTravelers(true)} error={errors.travelers} />{errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}{message ? <Text style={styles.notice}>{message}</Text> : null}<SearchSubmitButton label="Search Deals" submitting={submitting} onPress={submit} /><CounterSheet visible={showTravelers} title="Travelers" onClose={() => setShowTravelers(false)} counters={[{ label: "Travelers", value: values.travelers, min: 1, max: 9, onChange: (travelers) => setValues((current) => ({ ...current, travelers })) }]} /></View>;
}
