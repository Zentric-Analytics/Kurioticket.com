import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";

export const metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 py-8">
        <Card className="mx-auto max-w-3xl p-5">
          <p className="text-sm font-semibold text-teal-dark">Optional smart onboarding</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Tune your travel preferences</h1>
          <p className="mt-2 text-muted">You can skip this now and update preferences later.</p>
          <form className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Preferred home airport">
              <Input name="homeAirport" placeholder="IAH" />
            </Field>
            <Field label="Preferred airlines">
              <Input name="airlines" placeholder="Delta, United" />
            </Field>
            <Field label="Budget style">
              <Select name="budgetStyle">
                <option>Lowest reasonable fare</option>
                <option>Balanced value</option>
                <option>Comfort when it matters</option>
              </Select>
            </Field>
            <Field label="Direct vs cheaper">
              <Select name="directVsCheaper">
                <option>Prefer direct when close</option>
                <option>Choose cheaper if layover is good</option>
                <option>Always minimize travel effort</option>
              </Select>
            </Field>
            <Field label="Travel frequency">
              <Select name="travelFrequency">
                <option>A few times a year</option>
                <option>Monthly</option>
                <option>Often for work</option>
              </Select>
            </Field>
            <Field label="Travel purpose">
              <Select name="travelPurpose">
                <option>Leisure</option>
                <option>Family</option>
                <option>Business</option>
                <option>Mixed</option>
              </Select>
            </Field>
          </form>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/dashboard" variant="accent">Save preferences later</LinkButton>
            <LinkButton href="/dashboard" variant="secondary">Skip</LinkButton>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
