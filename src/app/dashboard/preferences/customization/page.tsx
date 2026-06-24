import { AccountPreferencesHeader } from "../AccountPreferencesHeader";
import { Footer } from "@/components/layout/Footer";
import { CustomizationPreferencesContent } from "./CustomizationPreferencesContent";

export const metadata = {
  title: "Customization preferences",
};

export default function CustomizationPreferencesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AccountPreferencesHeader />
      </div>
      <CustomizationPreferencesContent />
      <Footer />
    </>
  );
}
