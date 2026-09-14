import { buildGoogleCarMapEmbedUrl, buildGoogleCarStreetViewEmbedUrl } from "@/lib/cars/carMap";
import type { CarSearchParams } from "@/lib/cars/types";
import { getCarDetails } from "@/services/travel/carAggregator";

const headers={"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"strict-origin-when-cross-origin","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; frame-src https://www.google.com; base-uri 'none'; form-action 'none'"};
const escapeHtmlAttribute=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);
const required=["id","pickupLocation","dropoffLocation","pickupDate","pickupTime","dropoffDate","dropoffTime","driverAge"] as const;
const validCoordinate=(value:string|null,min:number,max:number)=>{if(value===null||value.trim()==="")return null;const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:null;};

export async function GET(request:Request){
  const query=new URL(request.url).searchParams;
  const values=Object.fromEntries(required.map(key=>[key,query.get(key)?.trim()??""])) as Record<(typeof required)[number],string>;
  if(required.some(key=>!values[key])||!/^\d{4}-\d{2}-\d{2}$/.test(values.pickupDate)||!/^\d{4}-\d{2}-\d{2}$/.test(values.dropoffDate))return new Response("Valid car search identity is required.",{status:400});
  const view=query.get("view")?.trim()||"map";
  if(view!=="map"&&view!=="streetview")return new Response("View must be map or streetview.",{status:400});
  const search:CarSearchParams={pickupLocation:values.pickupLocation,dropoffLocation:values.dropoffLocation,pickupDate:values.pickupDate,pickupTime:values.pickupTime,dropoffDate:values.dropoffDate,dropoffTime:values.dropoffTime,driverAge:values.driverAge};
  const car=await getCarDetails(values.id,search);
  if(!car)return new Response("Car not found.",{status:404});
  const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  let embedUrl:string|null=null;
  let title="Car pickup map";
  if(view==="streetview"){
    const latitude=validCoordinate(query.get("latitude"),-90,90);
    const longitude=validCoordinate(query.get("longitude"),-180,180);
    if(latitude===null||longitude===null)return new Response("Valid Street View coordinates are required.",{status:400});
    embedUrl=buildGoogleCarStreetViewEmbedUrl({latitude,longitude,googleMapsEmbedApiKey:key});
    title="Car pickup area Street View";
  }else{
    embedUrl=buildGoogleCarMapEmbedUrl({pickupLocation:car.pickupLocation,googleMapsEmbedApiKey:key});
  }
  if(!embedUrl)return new Response(view==="streetview"?"Street View unavailable.":"Map preview unavailable.",{status:503});
  const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style></head><body><iframe src="${escapeHtmlAttribute(embedUrl)}" title="${escapeHtmlAttribute(title)}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></body></html>`;
  return new Response(html,{status:200,headers});
}
