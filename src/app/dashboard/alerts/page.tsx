import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PriceAlertsContent } from "./PriceAlertsContent";

export const metadata = {
  title: "Price alerts",
};

export default function AlertsPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader showAccountBackLink />
      </div>
      <PriceAlertsContent />
      <Footer />
    </>
  );
}
