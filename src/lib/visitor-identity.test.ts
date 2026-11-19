import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisitorToken,
  hashVisitorToken,
  isSameOriginRequest,
  isNativeVisitorRequest,
  readVisitorToken,
  visitorCookieName,
  visitorTrackingDenied,
} from "./visitor-identity";
import { visitorDenialCookieName } from "./visitor-consent-constants";

const publicUrlKeys = ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL"] as const;

function withPublicUrls(values: Partial<Record<typeof publicUrlKeys[number], string>>, run: () => void) {
  const previous = publicUrlKeys.map(key => process.env[key]);
  try {
    for (const key of publicUrlKeys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    run();
  } finally {
    publicUrlKeys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
}

test("visitor tokens are opaque, stable for hashing, and never accepted when malformed", () => {
  const token = createVisitorToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashVisitorToken(token), hashVisitorToken(token));
  assert.notEqual(hashVisitorToken(token), token);
  assert.equal(readVisitorToken(new Request("https://kurioticket.com", { headers: { cookie: `${visitorCookieName}=not-a-token` } })), null);
});

test("native identities use only their explicit header and never inherit web cookies", () => {
  const browserToken = createVisitorToken();
  const nativeToken = createVisitorToken();
  const request = new Request("https://kurioticket.com/api/hotels/search", {
    headers: { cookie: `${visitorCookieName}=${browserToken}`, "x-mobile-platform": "ios", "x-kt-visitor": nativeToken },
  });
  assert.equal(isNativeVisitorRequest(request), true);
  assert.equal(readVisitorToken(request), nativeToken);
  assert.equal(readVisitorToken(request, "web"), browserToken);
  assert.equal(readVisitorToken(new Request(request.url, { headers: { cookie: `${visitorCookieName}=${browserToken}`, authorization: "Bearer invalid" } })), null);
  assert.equal(readVisitorToken(new Request(request.url, { headers: { cookie: `${visitorCookieName}=${browserToken}`, "x-mobile-platform": "android", "x-kt-visitor": "malformed" } })), null);
});

test("unmarked browser requests cannot select a native identity by supplying its token header", () => {
  const token = createVisitorToken();
  const request = new Request("https://kurioticket.com", { headers: { "x-kt-visitor": token } });
  assert.equal(readVisitorToken(request), null);
  assert.equal(readVisitorToken(request, "native"), token);
});

test("browser opt-out suppresses tracking without hiding the credential needed to retry withdrawal", () => {
  const token = createVisitorToken();
  const cookie = `${visitorCookieName}=${token}; ${visitorDenialCookieName}=1`;
  const request = new Request("https://kurioticket.com", { headers: { cookie } });
  assert.equal(visitorTrackingDenied(request), true);
  assert.equal(readVisitorToken(request), token);
  assert.equal(visitorTrackingDenied(new Request(request.url, { headers: { cookie: `${visitorDenialCookieName}=10` } })), false);
  const nativeRequest = new Request(request.url, { headers: { cookie, "x-mobile-platform": "ios", "x-kt-visitor": token } });
  assert.equal(visitorTrackingDenied(nativeRequest), false);
  assert.equal(visitorTrackingDenied(request, "native"), false);
  assert.equal(visitorTrackingDenied(nativeRequest, "web"), true, "explicit browser endpoints always honor browser denial");
});

test("visitor cookie parsing only returns the first-party visitor token", () => {
  const token = createVisitorToken();
  const request = new Request("https://kurioticket.com/api/identity/visitor", {
    headers: { cookie: `theme=dark; ${visitorCookieName}=${token}; session=secret` },
  });

  assert.equal(readVisitorToken(request), token);
});

test("identity mutations reject cross-origin browser requests", () => {
  withPublicUrls({}, () => {
    assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { origin: "https://kurioticket.com" } })), true);
    assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { origin: "https://attacker.example" } })), false);
    assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", { headers: { "sec-fetch-site": "cross-site" } })), false);
  });
});

test("public origins work when the proxy exposes an internal request host or protocol", () => {
  for (const origin of ["https://staging.kurioticket.com", "https://kurioticket.com", "https://www.kurioticket.com"]) {
    withPublicUrls({ NEXT_PUBLIC_APP_URL: origin }, () => {
      for (const target of ["http://localhost:10000", "https://localhost:10000", origin.replace("https:", "http:")]) {
        assert.equal(isSameOriginRequest(new Request(`${target}/api/identity/visitor`, {
          headers: { origin, "sec-fetch-site": "same-origin" },
        })), true, `${origin} through ${target}`);
      }
    });
  }
});

test("the configured public URL is authoritative over request and forwarded hosts", () => {
  withPublicUrls({ NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com" }, () => {
    for (const origin of ["https://attacker.example", "https://kurioticket.com", "http://localhost:10000"]) {
      assert.equal(isSameOriginRequest(new Request(`${origin}/api/identity/visitor`, {
        headers: {
          origin, host: new URL(origin).host,
          "x-forwarded-host": new URL(origin).host, "x-forwarded-proto": new URL(origin).protocol.slice(0, -1),
          forwarded: `host=${new URL(origin).host};proto=https`, "sec-fetch-site": "same-origin",
        },
      })), false, origin);
    }
    assert.equal(isSameOriginRequest(new Request("http://localhost:10000/api/identity/visitor", {
      headers: { origin: "https://staging.kurioticket.com", host: "attacker.example", "x-forwarded-host": "attacker.example" },
    })), true, "untrusted forwarding metadata must not replace the configured public origin");
  });
});

test("public URL configuration follows application precedence without widening the trust set", () => {
  const check = (origin: string) => isSameOriginRequest(new Request("http://localhost:10000/api/identity/visitor", { headers: { origin } }));
  withPublicUrls({ NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com/", NEXTAUTH_URL: "https://kurioticket.com/api/auth" }, () => {
    assert.equal(check("https://staging.kurioticket.com"), true);
    assert.equal(check("https://kurioticket.com"), false);
  });
  withPublicUrls({ NEXTAUTH_URL: "https://kurioticket.com/api/auth" }, () => {
    assert.equal(check("https://kurioticket.com"), true);
    assert.equal(check("https://staging.kurioticket.com"), false);
  });
});

test("an invalid configured public URL fails closed instead of trusting the request or fallback config", () => {
  for (const publicUrl of ["not a URL", " ", "null", "file:///tmp/app", "ftp://kurioticket.com", "https://user:secret@kurioticket.com"]) {
    withPublicUrls({ NEXT_PUBLIC_APP_URL: publicUrl, NEXTAUTH_URL: "https://kurioticket.com" }, () => {
      assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", {
        headers: { origin: "https://kurioticket.com" },
      })), false, publicUrl);
    });
  }
});

test("Origin must contain one serialized HTTP origin without paths, credentials or opaque values", () => {
  withPublicUrls({ NEXT_PUBLIC_APP_URL: "https://kurioticket.com" }, () => {
    for (const origin of [
      "", "null", "not a URL", "https://kurioticket.com/", "https://kurioticket.com/path",
      "https://kurioticket.com?tracking=true", "https://kurioticket.com#fragment",
      "https://user:password@kurioticket.com", "https://attacker.example@kurioticket.com",
      "https://kurioticket.com, https://attacker.example", "https://kurioticket.com https://attacker.example",
      "blob:https://kurioticket.com/id", "data:text/html,hello", "file:///tmp/app",
    ]) {
      assert.equal(isSameOriginRequest(new Request("https://kurioticket.com/api/identity/visitor", {
        headers: { origin },
      })), false, JSON.stringify(origin));
    }
  });
});

test("same-site subdomains, different schemes and ports do not count as the configured origin", () => {
  withPublicUrls({ NEXT_PUBLIC_APP_URL: "https://kurioticket.com" }, () => {
    for (const origin of ["https://staging.kurioticket.com", "https://www.kurioticket.com", "http://kurioticket.com", "https://kurioticket.com:8443", "https://kurioticket.com.attacker.example"]) {
      assert.equal(isSameOriginRequest(new Request("http://localhost:10000/api/identity/visitor", {
        headers: { origin, "sec-fetch-site": "same-site" },
      })), false, origin);
    }
  });
});

test("unconfigured local development matches the direct origin including its port", () => {
  withPublicUrls({}, () => {
    for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]) {
      assert.equal(isSameOriginRequest(new Request(`${origin}/api/identity/visitor`, { headers: { origin } })), true);
    }
    assert.equal(isSameOriginRequest(new Request("http://localhost:3000/api/identity/visitor", {
      headers: { origin: "http://localhost:3001", "x-forwarded-host": "localhost:3001" },
    })), false);
  });
});

test("missing Origin remains supported for native clients without bypassing explicit origin checks", () => {
  withPublicUrls({ NEXT_PUBLIC_APP_URL: "https://staging.kurioticket.com" }, () => {
    for (const platform of ["ios", "android"]) {
      const headers = { "x-mobile-platform": platform, authorization: "Bearer native-session" };
      const url = "http://localhost:10000/api/mobile/v1/identity/visitor";
      assert.equal(isSameOriginRequest(new Request(url, { headers })), true);
      assert.equal(isSameOriginRequest(new Request(url, { headers: { ...headers, origin: "https://attacker.example" } })), false);
      assert.equal(isSameOriginRequest(new Request(url, { headers: { ...headers, "sec-fetch-site": "cross-site" } })), false);
    }
    assert.equal(isSameOriginRequest(new Request("http://localhost:10000/api/identity/visitor")), true);
    assert.equal(isSameOriginRequest(new Request("http://localhost:10000/api/identity/visitor", {
      headers: { origin: "https://staging.kurioticket.com", "sec-fetch-site": "cross-site" },
    })), false);
  });
});
