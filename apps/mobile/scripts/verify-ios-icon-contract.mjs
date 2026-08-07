import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..", "..");
const appConfigPath = path.join(root, "apps/mobile/app.config.ts");
const iconPath = path.join(root, "apps/mobile/assets/kurioticket-icon-ios.png");

const expectedIosIcon = "./assets/kurioticket-icon-ios.png";
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
  if (!iosIcon || iosIcon[1] !== expectedIosIcon) {
    fail(`ios.icon must be ${expectedIosIcon}`);
  }

  const androidForeground = configText.match(
    /android:\s*{[\s\S]*?adaptiveIcon:\s*{[\s\S]*?foregroundImage:\s*"([^"]+)"/,
  );
  if (!androidForeground || androidForeground[1] !== expectedAndroidForeground) {
    fail(`Android adaptive foreground must remain ${expectedAndroidForeground}`);
  }
}

async function checkImage() {
  if (!fs.existsSync(iconPath)) fail(`Missing configured iOS icon: ${iconPath}`);

  const metadata = await sharp(iconPath).metadata();
  if (metadata.format !== "png") fail(`iOS icon format is ${metadata.format}, expected PNG`);
  if (metadata.width !== 1024 || metadata.height !== 1024) {
    fail(`iOS icon is ${metadata.width}x${metadata.height}, expected 1024x1024`);
  }

  const { data, info } = await sharp(iconPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 3; offset < data.length; offset += info.channels) {
    if (data[offset] !== 255) fail("iOS icon contains transparent pixels");
  }

  const cornerBand = 100;
  for (const [right, bottom] of [[false, false], [true, false], [false, true], [true, true]]) {
    for (let x = 0; x < cornerBand; x += 1) {
      for (let y = 0; y < cornerBand; y += 1) {
        const pixelX = right ? info.width - 1 - x : x;
        const pixelY = bottom ? info.height - 1 - y : y;
        const offset = (pixelY * info.width + pixelX) * info.channels;
        if (data[offset] < 245 || data[offset + 1] < 245 || data[offset + 2] < 245) {
          fail("iOS icon appears to have pre-rendered rounded corners");
        }
      }
    }
  }
}

checkConfig();
await checkImage();
console.log("iOS icon contract verified: configured PNG, 1024x1024, opaque, square corners.");
console.log("Android adaptive icon configuration remains unchanged.");
