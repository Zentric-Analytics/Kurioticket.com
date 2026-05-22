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
      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 py-10">
        <section className="page-shell">
        <h1 className="text-4xl font-extrabold tracking-tight text-indigo-950">Best Deals</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Featured deal controls are ready for admin curation and future provider-backed deal feeds.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {deals.map(([route, price, note]) => (
            <Card key={route} className="border-indigo-100 p-6">
              <p className="text-sm font-semibold text-slate-500">{route}</p>
              <div className="mt-2 text-3xl font-extrabold text-indigo-950">{price}</div>
              <p className="mt-2 text-sm text-slate-600">{note}</p>
              <LinkButton href="/flights/results" variant="secondary" className="mt-4 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Search route</LinkButton>
            </Card>
          ))}
        </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
