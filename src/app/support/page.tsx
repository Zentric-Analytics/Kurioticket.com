import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SupportPageContent } from "@/components/support/SupportPageContent";

export const metadata = {
  title: "Customer support",
};

export default function SupportPage() {
  return (
    <>
      <AppHeader />
      <SupportPageContent />
      <Footer />
    </>
  );
}
