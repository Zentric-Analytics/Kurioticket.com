import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeatureControlProductionAdmins } from "@/lib/env";
import { listFeatureControls } from "@/lib/feature-controls/service";
import { FeatureControlsPanel } from "@/components/admin/FeatureControlsPanel";
import { productionSandboxHost, readProductionSandboxState } from "@/lib/productionSandboxPolicy";
import { providerManagementStatus } from "@/services/providerManagement";
export const metadata = { title: "Provider Management | Kurioticket Admin" };
export default async function ProviderManagementPage() {
    const [controls, state, session] = await Promise.all([listFeatureControls(), readProductionSandboxState(), getServerSession(authOptions)]);
    const permitted = getFeatureControlProductionAdmins().includes(session?.user?.email?.trim().toLowerCase() || "");
    const production = productionSandboxHost();
    return <section className="min-w-0 space-y-6">
  <header><h1 className="text-xl font-semibold">Provider Management</h1><p className="mt-2 text-sm text-slate-600">One production setting for the website, Android and iOS. Test inventory is display-only: no caching, saving, checkout or payments. Live providers are independent.</p></header>
  {!production && <p role="status">The production master control is available only in the production dashboard. This environment cannot change production policy.</p>}
  <FeatureControlsPanel initialControls={controls.controls.filter(row => row.key === "ALLOW_SANDBOX_RESULTS_IN_PRODUCTION")} hideCategoryHeading environment="PRODUCTION" canControlProduction={permitted} operationsAvailable={production && controls.dataAvailable && state.available}/>
  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="py-3 text-left font-semibold">Configured provider modes — credential presence does not verify account entitlement or connectivity</caption><thead><tr>{["Provider", "Product", "Configured mode", "Credential class", "Effective sandbox display"].map(label => <th key={label} className="border-b p-3">{label}</th>)}</tr></thead><tbody>{providerManagementStatus(production && state.enabled).map(row => <tr key={row.provider + row.product}><td className="p-3">{row.provider}</td><td className="p-3">{row.product}</td><td className="p-3">{row.configuredMode}</td><td className="p-3">{row.credentialMode}</td><td className="p-3">{row.sandboxAvailable ? "ON — display only" : "OFF / unavailable"}</td></tr>)}</tbody></table></div>
 </section>;
}
