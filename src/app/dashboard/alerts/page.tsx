import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PriceAlertsContent } from "./PriceAlertsContent";

export const metadata = {
  title: "Price alerts",
};

export default function AlertsPage() {
  return (
    <>
      <AppHeader showAccountBackLink />
      <PriceAlertsContent />
      <Footer />
    </>
  );
}
