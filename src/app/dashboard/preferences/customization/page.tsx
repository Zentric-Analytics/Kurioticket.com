import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { CustomizationPreferencesContent } from "./CustomizationPreferencesContent";

export const metadata = {
  title: "Customization preferences",
};

export default function CustomizationPreferencesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <CustomizationPreferencesContent />
      <Footer />
    </>
  );
}
