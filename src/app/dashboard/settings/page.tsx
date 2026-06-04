import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export const metadata = {
  title: "Account Settings",
};

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-24 pb-8 sm:pt-28 lg:pt-28">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">My account</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">Account settings</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Manage account details and preferences from your Kurioticket account.
          </p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-bold text-navy">Notification preferences</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Review account email information and keep preference details in one place.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-navy">Privacy controls</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Review privacy information, account data guidance, and platform policies.</p>
            <LinkButton href="/legal" variant="secondary" className="mt-4">Review legal center</LinkButton>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
