import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Booking preferences",
};

const textFieldSections = [
  {
    title: "Airports",
    description: "Choose the airports you prefer to fly from.",
    fields: [
      { id: "home-airport", label: "Home airport", placeholder: "Search airport" },
      { id: "secondary-airports", label: "Secondary airports", placeholder: "Add alternative airports" },
    ],
  },
  {
    title: "Airlines",
    description: "Choose airlines you prefer or want to avoid.",
    fields: [
      { id: "preferred-airlines", label: "Preferred airlines", placeholder: "Search airlines" },
      { id: "avoid-airlines", label: "Avoid airlines", placeholder: "Search airlines" },
    ],
  },
  {
    title: "Stays",
    description: "Set accommodation preferences for hotel bookings.",
    fields: [
      { id: "preferred-hotel-chains", label: "Preferred hotel chains", placeholder: "Search hotel chains" },
      { id: "avoid-hotel-chains", label: "Avoid hotel chains", placeholder: "Search hotel chains" },
    ],
  },
];

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

function PreferenceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full rounded-2xl border border-slate-400 p-5 sm:p-6" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-preferences`}>
      <div>
        <h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-preferences`} className="text-lg font-semibold leading-7 text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid w-full gap-4 sm:max-w-lg sm:gap-5">{children}</div>
    </section>
  );
}

export default function PreferencesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader showAccountBackLink />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
        <header className="bg-[#4338CA] text-left">
          <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <h1 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:font-bold">Booking preferences</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
              Set your default travel preferences for faster and more relevant bookings.
            </p>
          </div>
        </header>

        <div className="mx-auto -mt-6 min-w-0 max-w-6xl space-y-6 px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
          <form className="w-full space-y-6" action="#">
            {textFieldSections.map((section) => (
              <PreferenceSection key={section.title} title={section.title} description={section.description}>
                {section.fields.map((field) => (
                  <div key={field.id} className="min-w-0 space-y-2">
                    <label htmlFor={field.id} className="block text-sm font-semibold leading-5 text-slate-800">
                      {field.label}
                    </label>
                    <input id={field.id} name={field.id} type="search" placeholder={field.placeholder} className={fieldClassName} />
                  </div>
                ))}
              </PreferenceSection>
            ))}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto"
              >
                Save preferences
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
