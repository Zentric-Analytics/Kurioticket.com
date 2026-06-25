import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { PriceAlertsContent } from "./PriceAlertsContent";

export const metadata = {
  title: "Kurioticket",
};

type AlertsPageProps = {
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams?.from;
  const showAccountLink = Array.isArray(fromParam)
    ? fromParam.includes("account")
    : fromParam === "account";

  return (
    <>
      <AppHeader />
      <PriceAlertsContent showAccountLink={showAccountLink} />
      <Footer />
    </>
  );
}
