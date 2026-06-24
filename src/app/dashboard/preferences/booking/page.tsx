import { AccountPreferencesHeader } from "../AccountPreferencesHeader";
import { Footer } from "@/components/layout/Footer";
import { BookingPreferencesContent } from "./BookingPreferencesContent";

export const metadata = {
  title: "Booking preferences",
};

export default function PreferencesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AccountPreferencesHeader />
      </div>
      <BookingPreferencesContent />
      <Footer />
    </>
  );
}
