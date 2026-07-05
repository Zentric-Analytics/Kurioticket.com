import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PrivacyPageClient } from "./PrivacyPageClient";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <>
      <AppHeader simpleHeader />
      <PrivacyPageClient />
      <Footer />
    </>
  );
}
