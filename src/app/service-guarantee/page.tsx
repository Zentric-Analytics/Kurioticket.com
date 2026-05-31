import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Service Guarantee",
};

export default function ServiceGuaranteePage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">Curioticket service commitment</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy">Service Guarantee</h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            We are preparing a detailed service guarantee for Curioticket customers. In the meantime, our support team can help with account access, search issues, saved trips, alerts, and provider redirect questions.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
