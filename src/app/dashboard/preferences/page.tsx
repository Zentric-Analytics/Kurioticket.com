import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Preferences",
};

export default function PreferencesPage() {
  return (
    <>
      <AppHeader showAccountBackLink />
      <main className="flex-1 bg-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <div className="page-shell min-w-0" />
      </main>
      <Footer />
    </>
  );
}
