"use client";
import { useEffect, useMemo, useState } from "react";
import { displayInventory, authorizedDisplayPhase } from "@/shared/search/lifecycle";
import { hasDisplayOnlyInventory } from "@/shared/presentation/sandboxInventory";
type State = {
    enabled: boolean;
    revision: string | null;
    controlled: boolean;
};
export function useSandboxResultState<T extends unknown[] | null>(results: T) {
    const [settled,setSettled]=useState(false);
    const [policy, setPolicy] = useState<State | null>(null);
    const needsPolicy = hasDisplayOnlyInventory(results);
    useEffect(() => {
        if (!needsPolicy)
            return;
        let active = true;
        let sequence = 0;
        const controllers = new Set<AbortController>();
        const refresh = async () => {
            const current = ++sequence;
            const controller = new AbortController();
            controllers.add(controller);
            const timer = setTimeout(() => controller.abort(), 4000);
            try {
                const response = await fetch("/api/provider-management/availability", { cache: "no-store", signal: controller.signal });
                if (!response.ok)
                    throw Error();
                const value = await response.json();
                if (active && current === sequence)
                    setPolicy(previous => value && typeof value.enabled === "boolean" && (value.revision === null || typeof value.revision === "string") ? (previous && previous.enabled === value.enabled && previous.revision === value.revision ? previous : value) : null);
            }
            catch {
                if (active && current === sequence)
                    setPolicy(null);
            }
            finally {
                if(active && current===sequence) setSettled(true);
                clearTimeout(timer);
                controllers.delete(controller);
            }
        };
        const invalidate = () => { sequence++; setSettled(false); setPolicy(null); void refresh(); };
        void refresh();
        const timer = setInterval(() => { if (document.visibilityState === "visible")
            void refresh(); }, 5000);
        window.addEventListener("focus", invalidate);
        document.addEventListener("visibilitychange", invalidate);
        return () => { active = false; clearInterval(timer); controllers.forEach(c => c.abort()); window.removeEventListener("focus", invalidate); document.removeEventListener("visibilitychange", invalidate); };
    }, [needsPolicy]);
    return useMemo(() => {const display=displayInventory(results,policy,settled);return {...display,...authorizedDisplayPhase(display.results?.length??0,display.authorization)};}, [results,policy,settled]);
}

/** Backward-compatible reader for detail and auxiliary consumers. */
export function useSandboxResults<T extends unknown[] | null>(results:T):T {return useSandboxResultState(results).results;}
