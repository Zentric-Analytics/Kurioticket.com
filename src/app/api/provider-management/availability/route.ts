import { productionSandboxHost, readProductionSandboxState } from "@/lib/productionSandboxPolicy";
export const dynamic = "force-dynamic";
export async function GET() { const controlled = productionSandboxHost(); const state = controlled ? await readProductionSandboxState() : { enabled: true, revision: null }; return Response.json({ controlled, enabled: state.enabled, revision: state.revision }, { headers: { "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store" } }); }
