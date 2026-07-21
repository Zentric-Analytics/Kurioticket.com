import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);

const blockedEnvFiles = trackedFiles.filter((file) => /^\.env(\.|$)/.test(file) && file !== ".env.example");
const secretTokenPatterns = [
  /sk_live_[A-Za-z0-9_]+/g,
  /sk_test_[A-Za-z0-9_]+/g,
  /whsec_[A-Za-z0-9_]+/g,
  /re_[A-Za-z0-9]{20,}/g,
  /duffel_(test|live)_[A-Za-z0-9_]+/gi,
  /OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9_-]+/g,
];

const serverSecretNames = [
  "AMADEUS_CLIENT_SECRET",
  "DUFFEL_API_KEY",
  "KIWI_API_KEY",
  "TRAVELPAYOUTS_API_KEY",
  "HOTEL_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_GOOGLE_SECRET",
];

const findings = [];

for (const file of trackedFiles) {
  if (!existsSync(file)) continue;
  if (/\.(png|jpg|jpeg|gif|ico|webp|lock)$/i.test(file)) continue;

  const content = readFileSync(file, "utf8");
  for (const pattern of secretTokenPatterns) {
    const matches = content.match(pattern);
    if (matches?.length) {
      findings.push(`${file}: contains a value matching ${pattern}`);
    }
  }

  for (const name of serverSecretNames) {
    if (content.includes(`NEXT_PUBLIC_${name}`)) {
      findings.push(`${file}: exposes server-only secret name as NEXT_PUBLIC_${name}`);
    }
  }
}

if (blockedEnvFiles.length) {
  findings.push(`Tracked env files are not allowed: ${blockedEnvFiles.join(", ")}`);
}

if (findings.length) {
  console.error("Secret verification failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret verification passed: no tracked env files or obvious secret tokens found.");
