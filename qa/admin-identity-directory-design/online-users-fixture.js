// Browser QA ONLY: fictional identities and presence records. No staging user data.
export async function readAdminOnlineUsers() {
  return {
    status:"ok", observedAt:"2026-11-21T19:30:00.000Z", windowSeconds:90,
    total:3, registeredAccounts:2, guestSessions:1,
    platforms:{desktop_web:2,mobile_web:2,ios:1,android:0,website:3,unclassified:0},
    rows:[
      {id:"qa-admin-001",kind:"registered",name:"Alana Example",email:"alana@example.invalid",
        role:"ADMIN",platforms:["desktop_web","mobile_web","ios"],lastSeenAt:"2026-11-21T19:29:59.000Z"},
      {id:"qa-support-001",kind:"registered",name:"Zara Example",email:"zara@example.invalid",
        role:"SUPPORT",platforms:["desktop_web"],lastSeenAt:"2026-11-21T19:29:58.000Z"},
      {id:"guest-1",kind:"guest",name:"Guest session",email:null,role:null,
        platforms:["mobile_web"],lastSeenAt:"2026-11-21T19:29:57.000Z"},
    ],
  };
}
