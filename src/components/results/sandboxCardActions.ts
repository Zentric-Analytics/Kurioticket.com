import { hasDisplayOnlyInventory } from "@/shared/presentation/sandboxInventory";
export function sandboxCardAction(value: unknown, event: {
    preventDefault(): void;
    stopPropagation(): void;
    key?: string;
}) { if (hasDisplayOnlyInventory(value) && (!event.key || ["Enter", " "].includes(event.key))) {
    event.preventDefault();
    event.stopPropagation();
} }
