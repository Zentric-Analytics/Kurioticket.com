export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startCacheMaintenance } = await import("@/lib/cacheMaintenance");
  const state = globalThis as typeof globalThis & { cacheMaintenanceStop?: () => void };
  state.cacheMaintenanceStop ??= startCacheMaintenance(process.env.RENDER_SERVICE_ID);
}
