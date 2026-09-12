import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isKayakSandboxEnabled,
  KayakError,
  KayakSandboxClient,
  kayakSearchSchema,
  kayakVertical,
} from "@/services/travel/kayakSandbox";

export const runtime = "nodejs";
const noStore = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

async function readSmallBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return body + decoder.decode();
      bytes += value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        throw new RangeError("Request too large.");
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  if (!isKayakSandboxEnabled())
    return NextResponse.json(
      { error: "Sandbox unavailable." },
      { status: 404, headers: noStore },
    );
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([
    new URL(process.env.NEXT_PUBLIC_APP_URL!).origin,
  ]);
  if (process.env.NODE_ENV === "development") {
    const local = new URL(process.env.NEXT_PUBLIC_APP_URL!);
    if (["localhost", "127.0.0.1"].includes(local.hostname)) {
      local.hostname =
        local.hostname === "localhost" ? "127.0.0.1" : "localhost";
      allowedOrigins.add(local.origin);
    }
  }
  if (!origin || !allowedOrigins.has(origin))
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers: noStore },
    );
  if (Number(request.headers.get("content-length")) > 4096)
    return NextResponse.json(
      { error: "Request too large." },
      { status: 413, headers: noStore },
    );
  let body;
  try {
    body = JSON.parse(await readSmallBody(request));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RangeError
            ? "Request too large."
            : "Invalid request.",
      },
      { status: error instanceof RangeError ? 413 : 400, headers: noStore },
    );
  }
  const parsedSearch = kayakSearchSchema.safeParse(body);
  const vertical = kayakVertical.safeParse(body?.vertical);
  const isPlaces =
    body?.action === "places" &&
    vertical.success &&
    typeof body?.term === "string" &&
    body.term.trim().length >= 2 &&
    body.term.length <= 80;
  if (!isPlaces && !parsedSearch.success)
    return NextResponse.json(
      { error: "Check the locations, dates and travelers." },
      { status: 400, headers: noStore },
    );
  const ip = getClientIp(request);
  // The override is local-only, for a developer whose browser connects over loopback.
  const clientIp =
    process.env.NODE_ENV === "development" &&
    process.env.KAYAK_LOCAL_TEST_CLIENT_IP
      ? process.env.KAYAK_LOCAL_TEST_CLIENT_IP
      : ip;
  if (!isIP(clientIp))
    return NextResponse.json(
      { error: "The trusted client network address is unavailable." },
      { status: 503, headers: noStore },
    );
  if (
    !checkRateLimit(`kayak-sandbox:${ip}`, 10, 60000).allowed ||
    !checkRateLimit(
      `kayak-sandbox:${isPlaces ? "places" : parsedSearch.data!.vertical}`,
      isPlaces ? 80 : 16,
      3600000,
    ).allowed
  )
    return NextResponse.json(
      { error: "Sandbox quota protection: try again later." },
      { status: 429, headers: noStore },
    );
  const oldTrack = request.cookies.get("kayak-sandbox-session")?.value;
  const trackId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      oldTrack || "",
    )
      ? oldTrack!
      : crypto.randomUUID();
  const client = new KayakSandboxClient(
    process.env.KAYAK_SANDBOX_API_KEY!,
    undefined,
    undefined,
    request.headers.get("user-agent") || "kayakaffiliateapp",
    clientIp,
  );
  const withSession = (response: NextResponse) => {
    response.cookies.set("kayak-sandbox-session", trackId, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/api/sandbox/kayak",
    });
    return response;
  };
  try {
    const results = isPlaces
      ? await client.places(
          vertical.data!,
          body.term.trim(),
          trackId,
          AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
        )
      : await client.search(
          parsedSearch.data!,
          trackId,
          request.signal,
          body.empty === true,
        );
    const response = NextResponse.json(
      {
        results,
        sandbox: true,
        status: results.length ? "available" : "empty",
      },
      { headers: noStore },
    );
    return withSession(response);
  } catch (error) {
    const code = error instanceof KayakError ? error.code : "unavailable";
    return withSession(
      NextResponse.json(
        {
          error:
            code === "rate_limited"
              ? "KAYAK sandbox limit reached. Try again later."
              : code === "timeout"
                ? "KAYAK search did not finish. Please retry."
                : "KAYAK sandbox is unavailable. Please retry later.",
          code,
          sandbox: true,
        },
        { status: code === "rate_limited" ? 429 : 502, headers: noStore },
      ),
    );
  }
}
