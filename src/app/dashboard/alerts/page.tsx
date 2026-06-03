import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "Price Alerts",
};

export default function AlertsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Account tools</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">Price alerts</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Alert management will appear here when price-tracking controls are connected to real account data.
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-bold text-navy">No price alerts yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Create alerts from search results when alert tools are available.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">Alert preferences</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Email and account preferences can be managed from account settings as controls are added.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">Start a search</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Search flights, hotels, or cars to continue planning with current provider information.</p>
            <LinkButton href="/flights/results" variant="secondary" className="mt-4 w-full">Search flights</LinkButton>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
