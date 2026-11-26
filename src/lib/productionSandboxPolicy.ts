import { countHotelInventory, type HotelResultAccounting } from "@/lib/hotels/hotelResultAccounting";
import { countCarInventory, type CarResultAccounting } from "@/lib/cars/carResultAccounting";
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
type FinalPublication={hotel?:true;car?:true;value?:{count:number;status:"SUCCESS"|"PARTIAL"|"FAILED";hotelResultAccounting?:HotelResultAccounting|null;carResultAccounting?:CarResultAccounting|null}};
const publicationKey=Symbol.for("kurioticket.search-final-publication.v1");
const publicationStores=globalThis as unknown as Record<symbol,AsyncLocalStorage<FinalPublication>>;
const publications=publicationStores[publicationKey]??=new AsyncLocalStorage<FinalPublication>();
/** Capture inside the route; after-response writers retain only a private
 * request-local reference, never a process-global inventory/policy cache. */
export function captureFinalSearchHistory(product?: "hotel" | "car") {
 const publication=publications.getStore();
 if(publication && product==="hotel")publication.hotel=true;
 if(publication && product==="car")publication.car=true;
 return <T extends {resultCount?:number;status?:string;query?:Record<string,unknown>}>(input:T):T=>{
  const final=publication?.value;
  if(!final)return input;
  // Preserve explicit car failures/partial outcomes (e.g. unsupported/empty).
  const status=product==="car" && input.status==="FAILED" ? "FAILED"
   : product==="car" && input.status==="PARTIAL" && final.status==="SUCCESS" ? "PARTIAL" : final.status;
  return {...input,resultCount:final.count,status,
   ...(product==="hotel" && input.query ? {query:{...input.query,hotelResultAccounting:final.hotelResultAccounting??null}}:{}),
   ...(product==="car" && input.query ? {query:{...input.query,carResultAccounting:final.carResultAccounting??null}}:{})};
 };
}
function publishFinalAccounting(payload:unknown) {
 const publication=publications.getStore();
 if(!publication || !payload || typeof payload!=="object")return;
 const value=payload as {results?:unknown;status?:unknown};
 if(Array.isArray(value.results))publication.value={count:value.results.length,status:value.status==="unavailable"?"FAILED":value.status==="partial"?"PARTIAL":"SUCCESS",
  ...(publication.hotel ? {hotelResultAccounting:countHotelInventory(value.results)}:{}),
  ...(publication.car ? {carResultAccounting:countCarInventory(value.results)}:{})};
}
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
    return publications.run({},()=>scope.run(grant, async () => {
        const response = await task();
        if (!response.headers.get("content-type")?.includes("application/json"))
            return response;
        const payload: unknown = await response.clone().json();
        if (!productionSandboxInventory(payload)) {
            publishFinalAccounting(payload);
            return response;
        }
        const final = await currentSandboxGrant();
        function filter(value: unknown): unknown {
            if (Array.isArray(value))
                return value.filter(item => !productionSandboxResult(item) || ((item as {
                    sandboxRevision?: string;
                }).sandboxRevision === final?.revision && final !== null)).map(filter);
            if (!value || typeof value !== "object")
                return value;
            const original = value as Record<string,unknown>;
            const projected = Object.fromEntries(Object.entries(original).map(([key,item])=>[key,filter(item)]));
            if(Array.isArray(original.results) && Array.isArray(projected.results) && original.results.length !== projected.results.length) {
                const count=projected.results.length;
                projected.status=count?"partial":"unavailable";
                projected.partial=Boolean(count);
                projected.source="metasearch";
                const uniqueCount=new Set(projected.results.map((row: {id?:string})=>row.id)).size;
                if(Array.isArray(projected.accounting)) projected.accounting=projected.accounting.map(entry=>entry && typeof entry === "object" && entry.stage === "public" ? {...entry,count,uniqueCount} : entry);
                projected.lifecycle=count?"partial":"restricted";
                for(const key of ["resultCount","receivedCount"]) if(key in original) projected[key]=count;
                if("available" in original) projected.available=count>0;
                if(!count) { projected.warnings=[]; projected.nextCursor=null; }
            }
            return projected;
        }
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "private, no-store, max-age=0");
        headers.set("CDN-Cache-Control", "no-store");
        headers.delete("Content-Length");
        const projected=filter(payload);
        publishFinalAccounting(projected);
        return new Response(JSON.stringify(projected), { status: response.status, headers });
    }));
}
