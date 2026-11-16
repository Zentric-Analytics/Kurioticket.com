import type { ApplicationSource } from "@/lib/application-source";
export type PlatformSelection = "ALL" | ApplicationSource;
export const platformOptions = [{ value: "ALL", label: "All Platforms" }, { value: "WEB", label: "Website" }, { value: "IOS", label: "iOS" }, { value: "ANDROID", label: "Android" }, { value: "UNKNOWN", label: "Unknown" }] as const;
export function applicationLabel(source?: string | null) { return platformOptions.find(option => option.value === source)?.label ?? "Unknown"; }
export function parsePlatformHealthView(params: URLSearchParams): {
    hours: number;
    application: PlatformSelection;
} | null {
    if ([...params.keys()].some(key => !["hours", "application"].includes(key)) || ["hours", "application"].some(key => params.getAll(key).length > 1))
        return null;
    const hours = params.get("hours") ?? "24", application = params.get("application") ?? "ALL";
    if (!["24", "168", "720"].includes(hours) || !platformOptions.some(option => option.value === application))
        return null;
    return { hours: Number(hours), application: application as PlatformSelection };
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
