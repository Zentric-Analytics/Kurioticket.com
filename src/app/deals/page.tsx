import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

const deals = [
  ["Houston to Tokyo", "$711", "Watch alternate airports and spring shoulder dates."],
  ["New York to London", "$394", "Strong fare bands often appear midweek."],
  ["Chicago to Cancun", "$246", "Good value for flexible long weekends."],
  ["Los Angeles to Mexico City", "$218", "Short-haul fare drops with early mornings."],
];

export const metadata = {
  title: "Deals",
};

export default function DealsPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <h1 className="text-3xl font-bold text-navy">Best Deals</h1>
        <p className="mt-2 max-w-2xl text-muted">Featured deal controls are ready for admin curation and future provider-backed deal feeds.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {deals.map(([route, price, note]) => (
            <Card key={route} className="p-5">
              <p className="text-sm font-semibold text-muted">{route}</p>
              <div className="mt-2 text-3xl font-bold text-navy">{price}</div>
              <p className="mt-2 text-sm text-muted">{note}</p>
              <LinkButton href="/flights/results" variant="secondary" className="mt-4">Search route</LinkButton>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
