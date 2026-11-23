import { AsyncLocalStorage } from "node:async_hooks";
import { getPrisma } from "@/lib/prisma";
import { isSandboxInventory } from "@/shared/presentation/sandboxInventory";
export const SANDBOX_CONTROL_KEY = "ALLOW_SANDBOX_RESULTS_IN_PRODUCTION";
export const SANDBOX_PROTOCOL_HEADER = "x-sandbox-results-policy";
type State = {
    enabled: boolean;
    revision: string | null;
    available: boolean;
};
type Grant = {
    revision: string;
    read: () => Promise<State>;
};
const scopeKey = Symbol.for("kurioticket.production-sandbox-request.v1");
// Aliased server modules must share request context, never inventory or policy values.
const requestScopes = globalThis as unknown as Record<symbol, AsyncLocalStorage<Grant | null>>;
const scope = requestScopes[scopeKey] ??= new AsyncLocalStorage<Grant | null>();
export function productionSandboxHost(env: Record<string, string | undefined> = process.env) {
    try {
        const url = new URL(env.NEXT_PUBLIC_APP_URL || "");
        return url.protocol === "https:" && ["kurioticket.com", "www.kurioticket.com"].includes(url.hostname);
    }
    catch {
        return false;
    }
}
export async function readProductionSandboxState() {
    try {
        const row = await getPrisma().featureFlag.findUnique({ where: { key_environment: { key: SANDBOX_CONTROL_KEY, environment: "PRODUCTION" } }, select: { enabled: true, updatedAt: true } });
        return { enabled: row?.enabled === true, revision: row?.updatedAt.toISOString() ?? null, available: true };
    }
    catch {
        return { enabled: false, revision: null, available: false };
    }
}
export async function currentSandboxGrant() {
    if (!productionSandboxHost())
        return null;
    const grant = scope.getStore();
    if (!grant)
        return null;
    const state = await grant.read();
    return state.available && state.enabled && state.revision === grant.revision ? grant : null;
}
export function productionSandboxResult(value: unknown) { return productionSandboxHost() && (isSandboxInventory(value) || Boolean(value && typeof value === "object" && (value as {
    provider?: string;
}).provider === "Duffel" && process.env.DUFFEL_API_KEY?.startsWith("duffel_test_"))); }
export function productionSandboxInventory(value: unknown) {
    if (!productionSandboxHost())
        return false;
    const testDuffel = process.env.DUFFEL_API_KEY?.startsWith("duffel_test_");
    function contains(item: unknown): boolean { return isSandboxInventory(item) || Boolean(item && typeof item === "object" && ((testDuffel && (item as {
        provider?: string;
    }).provider === "Duffel") || Object.values(item).some(contains))); }
    return contains(value);
}
/** Background work never receives a display grant. There is no process-local policy cache. */
export async function withProductionSandboxRequest(request: Request, task: () => Promise<Response>, read: () => Promise<State> = readProductionSandboxState): Promise<Response> {
    if (!productionSandboxHost())
        return task();
    const safeRead = () => read().catch(() => ({ enabled: false, revision: null, available: false }));
    const state = request.headers.get(SANDBOX_PROTOCOL_HEADER) === "1" ? await safeRead() : null;
    const grant = state?.available && state.enabled && state.revision ? { revision: state.revision, read: safeRead } : null;
    return scope.run(grant, async () => {
        const response = await task();
        if (!response.headers.get("content-type")?.includes("application/json"))
            return response;
        const payload: unknown = await response.clone().json();
        if (!productionSandboxInventory(payload))
            return response;
        const final = await currentSandboxGrant();
        function filter(value: unknown): unknown {
            if (Array.isArray(value))
                return value.filter(item => !productionSandboxResult(item) || ((item as {
                    sandboxRevision?: string;
                }).sandboxRevision === final?.revision && final !== null)).map(filter);
            if (!value || typeof value !== "object")
                return value;
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, filter(item)]));
        }
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "private, no-store, max-age=0");
        headers.set("CDN-Cache-Control", "no-store");
        headers.delete("Content-Length");
        return new Response(JSON.stringify(filter(payload)), { status: response.status, headers });
    });
}
