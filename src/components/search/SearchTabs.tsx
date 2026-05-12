"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plane, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";

type Tab = "flights" | "hotels";

export function SearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");
  const [tripType, setTripType] = useState("round-trip");
  const defaults = useMemo(() => {
    const depart = new Date();
    depart.setDate(depart.getDate() + 28);
    const back = new Date(depart);
    back.setDate(back.getDate() + 6);
    return {
      depart: depart.toISOString().slice(0, 10),
      back: back.toISOString().slice(0, 10),
    };
  }, []);

  function onFlightSubmit(formData: FormData) {
    const params = new URLSearchParams({
      tripType,
      origin: String(formData.get("origin") || ""),
      destination: String(formData.get("destination") || ""),
      departureDate: String(formData.get("departureDate") || ""),
      returnDate: String(formData.get("returnDate") || ""),
      travelers: String(formData.get("travelers") || "1"),
      cabinClass: String(formData.get("cabinClass") || "economy"),
    });
    router.push(`/flights/results?${params.toString()}`);
  }

  function onHotelSubmit(formData: FormData) {
    const params = new URLSearchParams({
      destination: String(formData.get("destination") || ""),
      checkIn: String(formData.get("checkIn") || ""),
      checkOut: String(formData.get("checkOut") || ""),
      guests: String(formData.get("guests") || "2"),
      rooms: String(formData.get("rooms") || "1"),
    });
    router.push(`/hotels/results?${params.toString()}`);
  }

  return (
    <Card className="w-full p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-1">
        <button
          type="button"
          className={`focus-ring flex h-11 items-center justify-center gap-2 rounded-md text-sm font-bold ${tab === "flights" ? "bg-white text-navy shadow-sm" : "text-muted"}`}
          onClick={() => setTab("flights")}
        >
          <Plane size={18} />
          Flights
        </button>
        <button
          type="button"
          className={`focus-ring flex h-11 items-center justify-center gap-2 rounded-md text-sm font-bold ${tab === "hotels" ? "bg-white text-navy shadow-sm" : "text-muted"}`}
          onClick={() => setTab("hotels")}
        >
          <Building2 size={18} />
          Hotels
        </button>
      </div>

      {tab === "flights" ? (
        <form action={onFlightSubmit} className="mt-5 grid gap-4">
          <div className="grid grid-cols-3 gap-2 sm:flex">
            {["round-trip", "one-way", "multi-city"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTripType(value)}
                className={`focus-ring h-10 rounded-md border px-3 text-sm font-semibold capitalize ${tripType === value ? "border-teal bg-teal/10 text-teal-dark" : "border-border bg-white text-muted"}`}
              >
                {value.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="From">
              <Input name="origin" placeholder="Houston or IAH" defaultValue="IAH" required />
            </Field>
            <Field label="To">
              <Input name="destination" placeholder="Tokyo or HND" defaultValue="HND" required />
            </Field>
            <Field label="Departure date">
              <Input name="departureDate" type="date" defaultValue={defaults.depart} required />
            </Field>
            <Field label="Return date">
              <Input name="returnDate" type="date" defaultValue={defaults.back} disabled={tripType === "one-way"} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <Field label="Travelers">
              <Input name="travelers" type="number" min={1} max={9} defaultValue={1} />
            </Field>
            <Field label="Cabin class">
              <Select name="cabinClass" defaultValue="economy">
                <option value="economy">Economy</option>
                <option value="premium-economy">Premium economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </Select>
            </Field>
            <Button size="lg" variant="accent" className="mt-auto">
              <Search size={18} />
              Search Flights
            </Button>
          </div>
        </form>
      ) : (
        <form action={onHotelSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field label="Destination">
              <Input name="destination" placeholder="Tokyo" defaultValue="Tokyo" required />
            </Field>
            <Field label="Check-in">
              <Input name="checkIn" type="date" defaultValue={defaults.depart} required />
            </Field>
            <Field label="Check-out">
              <Input name="checkOut" type="date" defaultValue={defaults.back} required />
            </Field>
            <Field label="Guests">
              <Input name="guests" type="number" min={1} max={12} defaultValue={2} />
            </Field>
            <Field label="Rooms">
              <Input name="rooms" type="number" min={1} max={6} defaultValue={1} />
            </Field>
          </div>
          <Button size="lg" variant="accent" className="sm:w-fit">
            <Search size={18} />
            Search Hotels
          </Button>
        </form>
      )}
    </Card>
  );
}
