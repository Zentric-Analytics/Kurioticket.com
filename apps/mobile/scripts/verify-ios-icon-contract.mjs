import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..", "..");
const appConfigPath = path.join(root, "apps/mobile/app.config.ts");
const iconPath = path.join(root, "apps/mobile/assets/kurioticket-icon-blue.png");

const expectedIosIcon = "./assets/kurioticket-icon-blue.png";
const expectedAndroidForeground = "./assets/kurioticket-adaptive-foreground.png";

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function checkConfig() {
  const configText = fs.readFileSync(appConfigPath, "utf8");
  const iosIcon = configText.match(
    /ios:\s*{\s*supportsTablet:\s*true,\s*bundleIdentifier:\s*environment\.bundleIdentifier,\s*icon:\s*"([^"]+)"/,
  );
  if (!iosIcon || iosIcon[1] !== expectedIosIcon) fail(`ios.icon must be ${expectedIosIcon}`);

  const androidForeground = configText.match(
    /android:\s*{[\s\S]*?adaptiveIcon:\s*{[\s\S]*?foregroundImage:\s*"([^"]+)"/,
  );
  if (!androidForeground || androidForeground[1] !== expectedAndroidForeground) {
    fail(`Android adaptive foreground must remain ${expectedAndroidForeground}`);
  }
}

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function checkImage() {
  if (!fs.existsSync(iconPath)) fail(`Missing configured iOS icon: ${iconPath}`);
  const png = fs.readFileSync(iconPath);
  if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail("iOS icon must be a PNG");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colorType = png[25];
  if (width !== 1024 || height !== 1024) fail(`iOS icon is ${width}x${height}, expected 1024x1024`);
  if (bitDepth !== 8 || colorType !== 2) fail("iOS icon must be opaque 8-bit RGB without an alpha channel");

  const idat = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const encoded = zlib.inflateSync(Buffer.concat(idat));
  const channels = 3;
  const rowBytes = width * channels;
  const pixels = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y += 1) {
    const encodedRow = y * (rowBytes + 1);
    const filter = encoded[encodedRow];
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = encoded[encodedRow + 1 + x];
      const output = y * rowBytes + x;
      const left = x >= channels ? pixels[output - channels] : 0;
      const up = y > 0 ? pixels[output - rowBytes] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[output - rowBytes - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3
        ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : fail(`Unsupported PNG filter ${filter}`);
      pixels[output] = (raw + predictor) & 255;
    }
  }

  const cornerBand = 100;
  for (const [right, bottom] of [[false, false], [true, false], [false, true], [true, true]]) {
    for (let x = 0; x < cornerBand; x += 1) {
      for (let y = 0; y < cornerBand; y += 1) {
        const pixelX = right ? width - 1 - x : x;
        const pixelY = bottom ? height - 1 - y : y;
        const offset = (pixelY * width + pixelX) * channels;
        if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) {
          fail("iOS icon appears to have pre-rendered rounded corners");
        }
      }
    }
  }
}

checkConfig();
checkImage();
console.log("iOS icon contract verified: configured PNG, 1024x1024, opaque, square corners.");
console.log("Android adaptive icon configuration remains unchanged.");
