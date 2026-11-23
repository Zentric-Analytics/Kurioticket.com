/** Inventory provenance travels with the result; never infer live from a missing flag. */
export function isSandboxInventory(value: unknown): boolean {
    if (!value || typeof value !== "object")
        return false;
    const row = value as Record<string, unknown>;
    return row.sandboxDisplayOnly === true || row.provider === "KAYAK sandbox" || row.inventorySource === "kayak-sandbox" || ([row.id, row.resultId].some(id => typeof id === "string" && /^(kayak-sandbox:|sandbox:duffel:)/.test(id)));
}
export function hasDisplayOnlyInventory(value: unknown): boolean {
    if (!value || typeof value !== "object")
        return false;
    if ((value as {
        sandboxDisplayOnly?: unknown;
    }).sandboxDisplayOnly === true)
        return true;
    return Object.values(value).some(hasDisplayOnlyInventory);
}
export function containsSandboxInventory(value: unknown): boolean { return isSandboxInventory(value) || Boolean(value && typeof value === "object" && Object.values(value).some(containsSandboxInventory)); }
export function displayOnlyInventory<T>(value: T, revision: string): T & {
    sandboxDisplayOnly: true;
    sandboxRevision: string;
    searchPolicy: {
        source: "duffel" | "kayak-sandbox";
        bookable: false;
        action: {
            kind: "none";
            enabled: false;
        };
    };
} {
    const blocked = new Set(["bookingUrl", "booking_url", "deeplink", "deepLink", "clickoutUrl", "handoffUrl", "rawProviderReference", "partnerRedirectUrl", "providerUrl", "testUrl", "bookUri"]);
    function clean(item: unknown): unknown {
        if (Array.isArray(item))
            return item.map(clean);
        if (!item || typeof item !== "object")
            return item;
        return Object.fromEntries(Object.entries(item).flatMap(([key,val]) => blocked.has(key) ? (["bookingUrl","partnerRedirectUrl"].includes(key) ? [[key,""]] : []) : [[key,clean(val)]]));
    }
    return { ...clean(value) as T, sandboxDisplayOnly: true, sandboxRevision: revision, searchPolicy: { source: (value as {
                provider?: string;
            }).provider === "Duffel" ? "duffel" : "kayak-sandbox", bookable: false, action: { kind: "none", enabled: false } } };
}
