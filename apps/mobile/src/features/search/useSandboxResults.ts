"use client";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../config/apiUrl";
import { AppState, Platform } from "react-native";
import { hasDisplayOnlyInventory } from "../../../../../src/shared/presentation/sandboxInventory";
type State = {
    enabled: boolean;
    revision: string | null;
    controlled: boolean;
};
export function useSandboxResults<T extends unknown[] | null>(results: T): T {
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
                const base = getApiBaseUrl(Platform.OS, __DEV__);
                if (!base.ok)
                    throw Error();
                const response = await fetch(base.baseUrl + "/api/provider-management/availability", { cache: "no-store", signal: controller.signal });
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
                clearTimeout(timer);
                controllers.delete(controller);
            }
        };
        const invalidate = () => { sequence++; setPolicy(null); void refresh(); };
        void refresh();
        const timer = setInterval(() => { if (AppState.currentState === "active")
            void refresh(); }, 5000);
        const subscription = AppState.addEventListener("change", invalidate);
        return () => { active = false; clearInterval(timer); controllers.forEach(c => c.abort()); subscription.remove(); };
    }, [needsPolicy]);
    return useMemo(() => Array.isArray(results) ? results.filter(value => !hasDisplayOnlyInventory(value) || Boolean(policy?.enabled && (value as {
        sandboxRevision?: string;
    }).sandboxRevision === policy.revision)) as T : results, [results, policy]);
}
