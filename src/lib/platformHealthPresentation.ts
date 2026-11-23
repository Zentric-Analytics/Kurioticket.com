import type { ApplicationSource } from "@/lib/application-source";
export type PlatformSelection = "ALL" | ApplicationSource;
export const platformOptions = [{ value: "ALL", label: "All Platforms" }, { value: "WEB", label: "Website" }, { value: "IOS", label: "iOS" }, { value: "ANDROID", label: "Android" }, { value: "UNKNOWN", label: "Unverified" }] as const;
export function applicationLabel(source?: string | null) { return platformOptions.find(option => option.value === source)?.label ?? "Unknown"; }
export function parsePlatformHealthView(params: URLSearchParams): {
    hours: number;
    period: "today" | "rolling";
    application: PlatformSelection;
} | null {
    if ([...params.keys()].some(key => !["hours", "application", "period", "window"].includes(key)) || ["hours", "application", "period", "window"].some(key => params.getAll(key).length > 1))
        return null;
    const selection = params.get("window");
    if (selection !== null && (params.has("hours") || params.has("period"))) return null;
    const hours = selection === "today" ? "24" : selection ?? params.get("hours") ?? "24";
    const application = params.get("application") ?? "ALL";
    const period = selection !== null ? (selection === "today" ? "today" : "rolling") : params.get("period") ?? (params.has("hours") ? "rolling" : "today");
    if (!["24", "168", "720"].includes(hours) || !["today", "rolling"].includes(period) ||
        (period === "today" && hours !== "24") || !platformOptions.some(option => option.value === application))
        return null;
    return { hours: Number(hours), period: period as "today" | "rolling", application: application as PlatformSelection };
}
export function failureRate(value: {
    total: number;
    disabled: number;
    failed: number;
}): string {
    const attempts = value.total - value.disabled;
    return attempts > 0 ? (100 * value.failed / attempts).toFixed(1) + "%" : "Not measured";
}
export function searchInvestigationHref(window: {
    from: string;
    to: string;
}, source: PlatformSelection) {
    const query = new URLSearchParams({ range: "custom", from: window.from, to: window.to });
    if (source !== "ALL")
        query.set("applicationSource", source);
    return "/admin/searches/activity?" + query.toString();
}
