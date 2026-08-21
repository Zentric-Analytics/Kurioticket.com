import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import releasePolicy from "../release-policy.json" with { type: "json" };

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ""), values[index + 1]]);
  return pairs;
}, []));
export function verifyProductionIpa({ plist, contents }) {
  const schemes = plist.CFBundleURLTypes?.flatMap((entry) => entry.CFBundleURLSchemes ?? []) ?? [];
  const expectedGoogleScheme = `com.googleusercontent.apps.${releasePolicy.production.googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`;
  const forbidden = ["com.kurioticket.app.preview", "kurioticket-preview", "https://staging.kurioticket.com"];

  if (plist.CFBundleIdentifier !== "com.kurioticket.app") throw new Error("IPA bundle identifier mismatch.");
  if ((plist.CFBundleDisplayName ?? plist.CFBundleName) !== "Kurioticket") throw new Error("IPA display name mismatch.");
  if (plist.CFBundleShortVersionString !== "0.3.0") throw new Error("IPA marketing version mismatch.");
  if (!/^\d+$/.test(String(plist.CFBundleVersion ?? ""))) throw new Error("IPA build number is invalid.");
  if (plist.ITSAppUsesNonExemptEncryption !== false) throw new Error("IPA export-compliance declaration mismatch.");
  if (!schemes.includes("kurioticket")) throw new Error("IPA Kurioticket URL scheme is missing.");
  if (!schemes.includes(expectedGoogleScheme)) throw new Error("IPA Production Google URL scheme does not match the approved release identity.");
  if (forbidden.some((value) => contents.includes(value) || JSON.stringify(plist).includes(value))) throw new Error("IPA contains a Preview or staging identity.");
  if (!contents.includes("https://kurioticket.com")) throw new Error("IPA Production API origin is missing.");
  if (!contents.includes("production-0.3.0")) throw new Error("IPA Production runtime is missing.");

  return { verified: true, bundleIdentifier: plist.CFBundleIdentifier, displayName: plist.CFBundleDisplayName ?? plist.CFBundleName, appVersion: plist.CFBundleShortVersionString, buildNumber: String(plist.CFBundleVersion), exportCompliance: false, schemes, forbiddenIdentityFound: false };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const plist = JSON.parse(readFileSync(args.plist, "utf8"));
  const evidence = verifyProductionIpa({ plist, contents: readFileSync(args.contents, "utf8") });
  if (args.output) writeFileSync(args.output, `${JSON.stringify(evidence, null, 2)}\n`);
  else console.log(JSON.stringify(evidence, null, 2));
}
