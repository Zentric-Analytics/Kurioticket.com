import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AboutPageContent } from "@/components/about/AboutPageContent";

export const metadata = {
  title: "About Kurioticket",
};

export default function AboutPage() {
  return (
    <>
      <AppHeader />
      <AboutPageContent />
      <Footer />
    </>
  );
}
