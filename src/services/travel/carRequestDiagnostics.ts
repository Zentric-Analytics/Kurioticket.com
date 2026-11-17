import { createHmac, randomBytes } from "node:crypto";

// Process-local, unexported salt makes fingerprints comparable within a server
// instance without publishing reusable hashes of IPs or rental criteria.
const salt = randomBytes(32);
const fingerprint = (value: string) => createHmac("sha256", salt).update(value).digest("hex").slice(0, 24);
export function carRequestDiagnostics(serializedBody: string, agent: string, clientIp: string) {
  return {
    endpoint: "car_poll_initial", method: "POST",
    payloadFingerprint: fingerprint(serializedBody),
    clientIpFingerprint: fingerprint(clientIp),
    agentFingerprint: fingerprint(agent),
    agentKind: /^KurioticketMobile\/[\w.+-]+ \(Android; Native\) OkHttp$/.test(agent) ? "android_application"
      : /^okhttp\//i.test(agent) ? "android_transport" : /^Mozilla\//.test(agent) ? "browser" : "other",
    nativeTransportDisclosed: /okhttp/i.test(agent),
  };
}
