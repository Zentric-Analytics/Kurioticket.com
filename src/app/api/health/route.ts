import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "curioticket",
    time: new Date().toISOString(),
  });
}
