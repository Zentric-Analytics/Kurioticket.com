import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Account Settings",
};

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <h1 className="text-3xl font-bold text-navy">Account Settings</h1>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-bold text-navy">Notification preferences</h2>
            <p className="mt-2 text-sm text-muted">Email alerts, in-app notifications, and future route intelligence preferences live here.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">Privacy controls</h2>
            <p className="mt-2 text-sm text-muted">Account deletion and GDPR/CCPA-style request workflows are modeled for Phase 1.</p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
