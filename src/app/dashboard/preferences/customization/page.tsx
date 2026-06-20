import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Customization preferences",
};

export default function CustomizationPreferencesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader showAccountBackLink />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
        <header className="bg-[#4338CA] text-left">
          <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:font-bold">Customization preferences</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Choose how Kurioticket personalizes your experience.
            </p>
          </div>
        </header>
      </main>
      <Footer />
    </>
  );
}
