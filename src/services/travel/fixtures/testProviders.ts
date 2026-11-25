import { providersFor, type ProviderRegistration, type SearchProduct, type ProductContracts } from "../providerRegistry";
/** Fixture adapters are injected only by tests; there is no runtime registration switch. */
export function fixtureProvider<P extends SearchProduct>(product: P, rows: ProductContracts[P]["offer"][]): ProviderRegistration<P> {
  return { id: `fixture-${product}`, label: `Fixture ${product}`, product, timeoutMs: 50,
    capabilities: { ...providersFor(product)[0].capabilities, mode: "test", environments: ["test"], refresh: "none", handoff: "none", booking: "none", details: "none" },
    readiness:()=>({configured:true,enabled:process.env.NODE_ENV==="test"}),
    supports: () => true,
    execute: async () => ({provider:`Fixture ${product}`,status:"success",results:rows,latencyMs:0}),
  };
}
