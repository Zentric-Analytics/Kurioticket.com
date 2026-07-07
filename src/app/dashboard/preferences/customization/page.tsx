import { AccountPreferencesHeader } from "../AccountPreferencesHeader";
import { Footer } from "@/components/layout/Footer";
import { CustomizationPreferencesContent } from "./CustomizationPreferencesContent";

export function generateMetadata() {
  return { title: "Email preferences" };
}

export default function CustomizationPreferencesPage() {
  return (
    <>
      <AccountPreferencesHeader />
      <CustomizationPreferencesContent />
      <Footer />
    </>
  );
}
