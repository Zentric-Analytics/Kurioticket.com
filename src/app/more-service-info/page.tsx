import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "More Service Info",
};

export default function MoreServiceInfoPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Curioticket service details</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy">More Service Info</h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            We are preparing additional service information for travelers. This page will explain how Curioticket support, travel search, saved trips, alerts, and partner redirects work together.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
