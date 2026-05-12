import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Price Alerts",
};

export default function AlertsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <h1 className="text-3xl font-bold text-navy">Price Alerts</h1>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <h2 className="font-bold text-navy">Free alerts</h2>
            <p className="mt-2 text-sm text-muted">Up to 3 active alerts with meaningful email updates.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">Premium monitoring</h2>
            <p className="mt-2 text-sm text-muted">Unlimited alerts, alternate airport and date tracking, trend analysis, and savings insights.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">No spam</h2>
            <p className="mt-2 text-sm text-muted">Alerts should only send when there is a meaningful travel decision signal.</p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
