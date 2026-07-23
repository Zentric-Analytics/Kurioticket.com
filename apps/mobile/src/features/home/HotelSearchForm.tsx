import { useState } from "react";
import { Text, View } from "react-native";
import { CounterSheet, FormTextField, ReadonlyField, SearchSubmitButton } from "./SearchFormControls";
import { searchFormStyles as styles } from "./searchFormStyles";
import { addDays, isIsoDate, sleep } from "./searchUtils";

type HotelSearchValues = { destination: string; checkIn: string; checkOut: string; rooms: number; guests: number };
type HotelErrors = Partial<Record<keyof HotelSearchValues | "dates", string>>;

export function HotelSearchForm() {
  const [values, setValues] = useState<HotelSearchValues>({ destination: "", checkIn: addDays(14), checkOut: addDays(17), rooms: 1, guests: 2 });
  const [errors, setErrors] = useState<HotelErrors>({});
  const [showCounters, setShowCounters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const validate = () => {
    const next: HotelErrors = {};
    if (!values.destination.trim()) next.destination = "Enter a destination.";
    if (!isIsoDate(values.checkIn)) next.checkIn = "Use YYYY-MM-DD.";
    if (!isIsoDate(values.checkOut)) next.checkOut = "Use YYYY-MM-DD.";
    if (values.checkIn && values.checkOut && values.checkOut <= values.checkIn) next.dates = "Check-out must be later than check-in.";
    if (values.rooms < 1) next.rooms = "Choose at least 1 room.";
    if (values.guests < 1) next.guests = "Choose at least 1 guest.";
    setErrors(next); return Object.keys(next).length === 0;
  };
  const submit = async () => { if (submitting || !validate()) return; setSubmitting(true); setMessage(""); await sleep(300); setSubmitting(false); setMessage("Hotel results are not available yet."); };
  return <View style={styles.card}><FormTextField label="Destination" value={values.destination} placeholder="City, hotel, or airport" onChangeText={(destination) => setValues({ ...values, destination })} error={errors.destination} /><View style={styles.row}><FormTextField compact label="Check-in" value={values.checkIn} placeholder="YYYY-MM-DD" onChangeText={(checkIn) => setValues({ ...values, checkIn })} error={errors.checkIn || errors.dates} /><FormTextField compact label="Check-out" value={values.checkOut} placeholder="YYYY-MM-DD" onChangeText={(checkOut) => setValues({ ...values, checkOut })} error={errors.checkOut} /></View><View style={styles.row}><ReadonlyField label="Rooms" value={`${values.rooms} room${values.rooms === 1 ? "" : "s"}`} onPress={() => setShowCounters(true)} error={errors.rooms} /><ReadonlyField label="Guests" value={`${values.guests} guest${values.guests === 1 ? "" : "s"}`} onPress={() => setShowCounters(true)} error={errors.guests} /></View>{message ? <Text style={styles.notice}>{message}</Text> : null}<SearchSubmitButton label="Search Hotels" submitting={submitting} onPress={submit} /><CounterSheet visible={showCounters} title="Rooms and guests" onClose={() => setShowCounters(false)} counters={[{ label: "Rooms", value: values.rooms, min: 1, max: 6, onChange: (rooms) => setValues((current) => ({ ...current, rooms })) }, { label: "Guests", value: values.guests, min: 1, max: 12, onChange: (guests) => setValues((current) => ({ ...current, guests })) }]} /></View>;
}
