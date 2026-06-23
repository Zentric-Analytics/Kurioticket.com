import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PriceAlertsContent } from "./PriceAlertsContent";

export const metadata = {
  title: "Kurioticket",
};

export default function AlertsPage() {
  return (
    <>
      <AppHeader />
      <PriceAlertsContent />
      <Footer />
    </>
  );
}
