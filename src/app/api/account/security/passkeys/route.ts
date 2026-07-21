import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

function labelPasskey(passkey: { deviceType: string | null; backedUp: boolean | null; transports: string | null }) {
  if (passkey.backedUp) return "Synced passkey";
  if (passkey.transports?.includes("usb") || passkey.transports?.includes("nfc")) return "Security key";
  if (passkey.deviceType === "platform") return "This device";
  return "Device, password manager, or security key";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const passkeys = await getPrisma().userPasskey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true, deviceType: true, backedUp: true, transports: true },
  });
  return NextResponse.json({ passkeys: passkeys.map((passkey) => ({ ...passkey, transports: undefined, label: labelPasskey(passkey) })) });
}
