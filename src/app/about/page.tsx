import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "About Kurioticket",
};

export default function AboutPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">About Kurioticket</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy">About Us</h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            Kurioticket is a travel search and comparison platform that helps travelers search,
            compare, and discover flights, hotels, cars, and travel deals.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            Our goal is to make travel planning clearer by bringing available options and provider
            information into one simple place, so travelers can review choices before continuing
            with the provider that fits their trip.
          </p>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">A practical travel planning tool</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Kurioticket focuses on helping travelers evaluate travel options with useful context.
            Availability, prices, rules, and final booking steps may vary by provider, so travelers
            should review the provider page carefully before making a decision.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
