import sharp from "sharp";
import { getStaticHotelById } from "@/services/travel/staticHotelResults";

const TILE_SIZE = 256;
const ZOOM = 15;
const headers = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  "Content-Type": "image/png",
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
};

function tilePosition(latitude: number, longitude: number) {
  const latitudeRadians = latitude * Math.PI / 180;
  const scale = 2 ** ZOOM;
  return {
    x: (longitude + 180) / 360 * scale,
    y: (1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale,
  };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return new Response("Hotel id is required.", { status: 400 });
  const hotel = getStaticHotelById(id);
  if (!hotel) return new Response("Hotel not found.", { status: 404 });
  if (!Number.isFinite(hotel.latitude) || !Number.isFinite(hotel.longitude)) return new Response("Map preview unavailable.", { status: 503 });

  try {
    const center = tilePosition(hotel.latitude, hotel.longitude);
    const centerX = Math.floor(center.x);
    const centerY = Math.floor(center.y);
    const tiles = await Promise.all([-1, 0, 1].flatMap((dx) => [-1, 0, 1].map(async (dy) => {
    const x = centerX + dx;
    const y = centerY + dy;
    const response = await fetch(`https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`, {
      headers: { "User-Agent": "Kurioticket/1.0 (https://kurioticket.com)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Map tile unavailable");
    return { input: Buffer.from(await response.arrayBuffer()), left: (dx + 1) * TILE_SIZE, top: (dy + 1) * TILE_SIZE };
    })));

    const markerX = Math.round((center.x - (centerX - 1)) * TILE_SIZE);
    const markerY = Math.round((center.y - (centerY - 1)) * TILE_SIZE);
    const overlay = Buffer.from(`<svg width="768" height="768" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${markerX - 18} ${markerY - 42})"><path d="M18 1C8.6 1 1 8.6 1 18c0 13 17 24 17 24s17-11 17-24C35 8.6 27.4 1 18 1z" fill="#075EE8" stroke="white" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="white"/></g><rect x="490" y="546" width="278" height="30" fill="white" fill-opacity=".88"/><text x="500" y="567" font-family="sans-serif" font-size="14" fill="#334155">© OpenStreetMap contributors</text></svg>`);
    const canvas = await sharp({ create: { width: 768, height: 768, channels: 4, background: "#E2E8F0" } }).png().toBuffer();
    const composed = await sharp(canvas)
      .composite([...tiles, { input: overlay, left: 0, top: 0 }])
      .png()
      .toBuffer();
    const image = await sharp(composed)
      .extract({ left: 64, top: 192, width: 640, height: 384 })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(image), { status: 200, headers });
  } catch {
    return new Response("Map preview unavailable.", { status: 503 });
  }
}
