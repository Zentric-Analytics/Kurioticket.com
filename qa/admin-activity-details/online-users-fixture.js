// Synthetic live roster only. No live provider, credential, session, or network data.
import { buildAdminOnlineUsersSnapshot } from "@/lib/adminOnlineUsersSnapshot";
import { adminLiveGuestReference } from "@/lib/adminLiveGuestReference";
const secret="synthetic-fixture-only-key-not-a-real-credential";
export async function readAdminOnlineUsers(environment, now=new Date()) {
  const guest=(digit,platform,seconds,details)=>{
    const sourceId=digit.repeat(64);
    const lastSeenAt=new Date(+now-seconds*1000);
    const liveReference=adminLiveGuestReference(environment,sourceId,secret);
    return {sourceId,platform,accountSessionId:null,userId:null,name:null,email:null,role:null,locationLabel:null,lastSeenAt,liveReference,
      ...(details?{liveCountryCode:"NG"}:{})};
  };
  return buildAdminOnlineUsersSnapshot([
    guest("a","desktop_web",2,true),guest("b","ios",4,false),guest("c","android",95,true),
    guest("e","mobile_web",5,true),guest("f","android",6,true),
    {sourceId:"d".repeat(64),platform:"mobile_web",accountSessionId:"qa-account",userId:"qa-registered-0001",name:"QA registered customer",email:"customer.qa@example.invalid",role:"USER",locationLabel:"Nigeria",lastSeenAt:new Date(+now-3000)}
  ],now);
}

// Simulate the server-only resolver decision, never adding recorded IDs to the
// roster. Production ownership/expiry/consent checks have separate service tests.
export async function resolveAdminLiveGuestHistory(row, environment) {
  if (environment !== "staging" || row.kind !== "guest") return null;
  const owners = [
    { source: "e", kind: "visitor", id: "qa-page-history-guest" },
    { source: "f", kind: "operational", id: "12345678-1234-4123-8123-123456789abc" },
  ];
  const owner = owners.find(candidate => row.liveReference === adminLiveGuestReference(environment, candidate.source.repeat(64), secret));
  return owner ? { kind: owner.kind, id: owner.id } : null;
}
