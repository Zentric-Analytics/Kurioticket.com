/** Fixed categories only. Never retain provider text, URLs, query, IP or credentials. */
export async function kayakRejectionDiagnostics(response: Response, path: string, method: string, agent: string) {
  const contentType = response.headers.get("content-type") || "";
  let sample = "";
  const reader = response.body?.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (reader) await Promise.race([
      (async () => {
        const decoder = new TextDecoder();
        let remaining = 8192;
        while (remaining > 0) {
          const { done, value } = await reader.read();
          if (done) break;
          sample += decoder.decode(value.subarray(0, remaining), { stream: true });
          remaining -= value.length;
        }
      })(),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 250); }),
    ]);
  } catch { /* Diagnostics must not replace the original provider error. */ }
  finally {
    if (timer) clearTimeout(timer);
    void reader?.cancel().catch(() => {});
  }
  const server = response.headers.get("server") || "";
  const ray = response.headers.get("cf-ray") || "";
  // A finite vocabulary can distinguish an unrecognized JSON error without
  // copying any arbitrary provider text into logs (including echoed secrets).
  const terms = {
    user_agent: /user[ _-]?agent/i, api_key: /api[ _-]?key/i,
    client_ip: /client[ _-]?ip|ip[ _-]?address/i, bot: /\bbot\b/i,
    forbidden: /\bforbidden\b/i, denied: /\bdenied\b/i,
    invalid: /\binvalid\b/i, missing: /\bmissing\b/i,
    unsupported: /\bunsupported\b/i, required: /\brequired\b/i,
    unauthorized: /\bunauthorized\b/i, blocked: /\bblocked\b/i,
  };
  return {
    endpoint: path === "/i/api/affiliate/search/car/v1/poll" ? "car_poll"
      : path === "/i/api/affiliate/search/flight/v1/poll" ? "flight_poll"
      : path === "/api/3.0/hotels" ? "hotels" : "other",
    method: method === "POST" ? "POST" : "GET",
    httpStatus: response.status,
    agentKind: /^(okhttp|dalvik)\//i.test(agent) ? "android_transport" : /^Mozilla\//.test(agent) ? "browser" : "other",
    contentType: /json/i.test(contentType) ? "json" : /html/i.test(contentType) ? "html" : /text/i.test(contentType) ? "text" : "other",
    serverKind: /cloudflare/i.test(server) ? "cloudflare" : /akamai/i.test(server) ? "akamai" : "other",
    evidenceTerms: Object.entries(terms).filter(([, pattern]) => pattern.test(sample)).map(([term]) => term),
    ...( /^[a-f0-9]{8,32}-[A-Z]{3}$/i.test(ray) ? { edgeRequestId: ray } : {}),
    evidence: response.headers.get("cf-mitigated") === "challenge" ? "explicit_cloudflare_challenge"
      : /(?:invalid|unsupported|disallowed|forbidden)[ _-]*user[ _-]?agent|user[ _-]?agent[ _-]+(?:(?:is|was|header|value|string)[ _-]+)*(?:not (?:allowed|supported)|blocked|rejected|invalid|missing|required)/i.test(sample) ? "explicit_user_agent_rejection"
      : /(?:invalid|expired|missing)\s+api[- ]?key/i.test(sample) ? "explicit_api_key_rejection"
      : /errors\.edgesuite\.net\//i.test(sample) ? "akamai_reference_page"
      : /<title>\s*access denied\s*<\/title>/i.test(sample) ? "access_denied_page"
      : "unspecified",
  };
}
