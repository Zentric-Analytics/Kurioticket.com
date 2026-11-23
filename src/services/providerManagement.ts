import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
export function providerManagementStatus(enabled: boolean, env: Record<string, string | undefined> = process.env) {
    const duffelKey = env.DUFFEL_API_KEY?.trim() || "";
    const credentialMode = duffelKey.startsWith("duffel_test_") ? "test" : duffelKey.startsWith("duffel_live_") ? "live" : duffelKey ? "unverified" : "not configured";
    const configuredMode = env.DUFFEL_API_MODE?.trim().toLowerCase() || "live";
    const compatible = credentialMode === configuredMode;
    return [
        { provider: "Duffel", product: "Flights", configured: Boolean(duffelKey), configuredMode, credentialMode, sandboxAvailable: enabled && compatible && credentialMode === "test", liveConfigured: compatible && credentialMode === "live" },
        ...["Hotels", "Cars"].map(product => ({ provider: "KAYAK", product, configured: Boolean(env.KAYAK_SANDBOX_API_KEY?.trim()), configuredMode: "sandbox", credentialMode: env.KAYAK_SANDBOX_API_KEY?.trim() ? "sandbox" : "not configured", sandboxAvailable: enabled && isKayakSandboxEnabled(env), liveConfigured: false })),
    ];
}
