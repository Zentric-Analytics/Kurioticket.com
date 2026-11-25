import { withProductionSandboxRequest } from "@/lib/productionSandboxPolicy";
import { getCarDetails } from "@/services/travel/carAggregator";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

/** Original snapshot lookup only. Never initiates a new supplier search. */
export async function GET(request:Request) {
  return withProductionSandboxRequest(request, async()=>{
    const headers={"Cache-Control":"private, no-store"};
    if(!await isFeatureEnabled("CAR_SEARCH_ENABLED")) return Response.json({results:[],status:"unavailable"},{status:503,headers});
    if(!checkRateLimit(`car-details:${getClientIp(request)}`,60,60_000).allowed) return Response.json({results:[],status:"unavailable"},{status:429,headers});
    const id=new URL(request.url).searchParams.get("id");
    if(!id || id.length>512 || /[\\/?#\u0000-\u001f]/.test(id)) return Response.json({results:[],status:"unavailable"},{status:400,headers});
    const result=await getCarDetails(id);
    return Response.json({results:result?[{...result,searchPolicy:{source:result.inventoryProvenance?"metasearch":"kayak-sandbox",bookable:false,action:{kind:"none",enabled:false}}}]:[],status:result?"available":"unavailable"},{status:result?200:404,headers});
  });
}
