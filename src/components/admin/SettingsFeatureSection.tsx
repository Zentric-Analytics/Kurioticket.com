import { getServerSession } from "next-auth";

import { FeatureControlsPanel } from "@/components/admin/FeatureControlsPanel";
import { authOptions } from "@/lib/auth";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { listFeatureControls } from "@/lib/feature-controls/service";

type FeatureCategory = "Travel Search" | "Travel Automation";

const sections = {
  "Travel Search": {
    title: "Product availability",
    description: "Manage travel search and Packages.",
  },
  "Travel Automation": {
    title: "Travel automation",
    description: "Manage price alerts and automatic checks.",
  },
} as const;

export async function SettingsFeatureSection({ category }: { category: FeatureCategory }) {
  const [featureControls, session] = await Promise.all([
    listFeatureControls(),
    getServerSession(authOptions),
  ]);
  const currentEmail = session?.user?.email?.trim().toLowerCase() || "";
  const canControlProduction = getFeatureControlProductionAdmins().includes(currentEmail);
  const section = sections[category];

  return (
    <section aria-labelledby="settings-section-title" className="min-w-0">
      <div className="border-b border-[#D8E1EC] pb-4">
        <h2 id="settings-section-title" className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#020617]">{section.title}</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{section.description}</p>
      </div>
      <FeatureControlsPanel
        initialControls={featureControls.controls.filter((control) => control.category === category)}
        environment={featureControls.environment}
        canControlProduction={canControlProduction}
        operationsAvailable={featureControls.dataAvailable}
        hideCategoryHeading
      />
    </section>
  );
}
