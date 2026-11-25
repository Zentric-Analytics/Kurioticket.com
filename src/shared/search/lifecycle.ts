import { hasDisplayOnlyInventory } from "../presentation/sandboxInventory";

export type DisplayAuthorization = "not-required" | "pending" | "authorized" | "restricted" | "unavailable";
export type SearchLifecycle = "resolving" | "invalid" | "unsupported" | "searching" | "partial" | "pending-authorization" | "available" | "empty" | "unavailable" | "filter-empty" | "restricted" | "expired" | "cancelled";
export type LifecycleInput = {
  phase?: "resolving" | "invalid" | "unsupported" | "searching" | "expired" | "cancelled";
  count: number;
  visibleCount?: number;
  authorization?: DisplayAuthorization;
  completed?: boolean;
  continuation?: boolean;
  partial?: boolean;
  status?: string;
};

/** Shared business meaning; platform adapters own rendering and navigation. */
export function searchLifecycle(input:LifecycleInput):SearchLifecycle {
  if(input.phase && input.phase!=="searching") return input.phase;
  if(input.count===0 && input.authorization==="pending") return "pending-authorization";
  if(input.count===0 && input.authorization==="restricted") return "restricted";
  if(input.count===0 && input.authorization==="unavailable") return "unavailable";
  if(input.count>0) {
    if(input.visibleCount===0) return "filter-empty";
    return input.continuation || input.partial || input.status==="partial" ? "partial" : "available";
  }
  if(input.phase==="searching" || input.continuation || input.completed===false) return "searching";
  if(input.status==="unavailable") return "unavailable";
  return "empty";
}

export function displayInventory<T extends unknown[] | null>(results:T, policy:{enabled:boolean;revision:string|null}|null, settled:boolean):{results:T;authorization:DisplayAuthorization} {
  if(!Array.isArray(results) || !hasDisplayOnlyInventory(results)) return {results,authorization:"not-required"};
  const eligible=results.filter(value=>!hasDisplayOnlyInventory(value)||Boolean(policy?.enabled && (value as {sandboxRevision?:string}).sandboxRevision===policy.revision)) as T;
  return {results:eligible,authorization:!settled?"pending":!policy?"unavailable":policy.enabled && eligible?.length===results.length?"authorized":"restricted"};
}

export function authorizedDisplayPhase(count:number,authorization:DisplayAuthorization) {
 const state=searchLifecycle({count,authorization});
 return {pending:state==="pending-authorization",unavailable:state==="restricted"||state==="unavailable"};
}
