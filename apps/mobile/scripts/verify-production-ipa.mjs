import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import releasePolicy from "../release-policy.json" with { type: "json" };
import credentialEvidence from "../release-baselines/ios/production-credential.json" with { type: "json" };

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (index % 2 === 0) pairs.push([value.replace(/^--/, ""), values[index + 1]]);
  return pairs;
}, []));
const normalizeSerial = (value) => String(value ?? "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();

export function verifyProductionIpa({ plist, appConfig, expoConfig, provisioningProfile, certificateSerials, signerCertificateSerial }) {
  const schemes = plist.CFBundleURLTypes?.flatMap((entry) => entry.CFBundleURLSchemes ?? []) ?? [];
  const expectedGoogleScheme = `com.googleusercontent.apps.${releasePolicy.production.googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`;
  const teamIdentifiers = provisioningProfile?.TeamIdentifier ?? [];
  const entitlements = provisioningProfile?.Entitlements ?? {};
  const expectedApplicationIdentifier = `${credentialEvidence.appleTeamId}.${credentialEvidence.bundleIdentifier}`;
  const normalizedCertificateSerials = (certificateSerials ?? []).map(normalizeSerial);

  if (plist.CFBundleIdentifier !== "com.kurioticket.app") throw new Error("IPA bundle identifier mismatch.");
  if ((plist.CFBundleDisplayName ?? plist.CFBundleName) !== "Kurioticket") throw new Error("IPA display name mismatch.");
  if (plist.CFBundleShortVersionString !== "0.3.0") throw new Error("IPA marketing version mismatch.");
  if (!/^\d+$/.test(String(plist.CFBundleVersion ?? ""))) throw new Error("IPA build number is invalid.");
  if (plist.ITSAppUsesNonExemptEncryption !== false) throw new Error("IPA export-compliance declaration mismatch.");
  if (!schemes.includes("kurioticket")) throw new Error("IPA Kurioticket URL scheme is missing.");
  if (!schemes.includes(expectedGoogleScheme)) throw new Error("IPA Production Google URL scheme does not match the approved release identity.");
  if (appConfig?.ios?.bundleIdentifier !== releasePolicy.production.bundleIdentifier || appConfig?.name !== releasePolicy.production.displayName) throw new Error("IPA embedded app identity mismatch.");
  if (appConfig?.extra?.environment?.apiBaseUrl !== releasePolicy.production.apiBaseUrl || appConfig?.extra?.environment?.isPreview !== false) throw new Error("IPA embedded Production environment mismatch.");
  if (appConfig?.runtimeVersion !== releasePolicy.production.runtimeVersion || expoConfig?.EXUpdatesRuntimeVersion !== releasePolicy.production.runtimeVersion) throw new Error("IPA Production runtime mismatch.");
  if (provisioningProfile?.UUID?.toLowerCase() !== credentialEvidence.provisioningProfileUuid.toLowerCase()) throw new Error("IPA provisioning profile UUID does not match reviewed credential evidence.");
  if (provisioningProfile?.Name !== credentialEvidence.provisioningProfileName) throw new Error("IPA provisioning profile name does not match reviewed credential evidence.");
  if (!teamIdentifiers.includes(credentialEvidence.appleTeamId) || entitlements["com.apple.developer.team-identifier"] !== credentialEvidence.appleTeamId) throw new Error("IPA Apple Team identity does not match reviewed credential evidence.");
  if (entitlements["application-identifier"] !== expectedApplicationIdentifier) throw new Error("IPA signing application identifier does not match reviewed credential evidence.");
  if (!normalizedCertificateSerials.includes(normalizeSerial(credentialEvidence.distributionCertificateSerial))) throw new Error("IPA signing certificate does not match reviewed credential evidence.");
  if (normalizeSerial(signerCertificateSerial) !== normalizeSerial(credentialEvidence.distributionCertificateSerial)) throw new Error("IPA actual code-signing certificate does not match reviewed credential evidence.");

  return { verified: true, bundleIdentifier: plist.CFBundleIdentifier, displayName: plist.CFBundleDisplayName ?? plist.CFBundleName, appVersion: plist.CFBundleShortVersionString, buildNumber: String(plist.CFBundleVersion), exportCompliance: false, schemes, activeApiOrigin: appConfig.extra.environment.apiBaseUrl, runtimeVersion: expoConfig.EXUpdatesRuntimeVersion, signing: { appleTeamId: credentialEvidence.appleTeamId, provisioningProfileUuid: credentialEvidence.provisioningProfileUuid, provisioningProfileName: credentialEvidence.provisioningProfileName, distributionCertificateSerial: credentialEvidence.distributionCertificateSerial, actualSignerCertificateSerial: normalizeSerial(signerCertificateSerial), applicationIdentifier: expectedApplicationIdentifier } };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const plist = JSON.parse(readFileSync(args.plist, "utf8"));
  const evidence = verifyProductionIpa({
    plist,
    appConfig: JSON.parse(readFileSync(args["app-config"], "utf8")),
    expoConfig: JSON.parse(readFileSync(args["expo-config"], "utf8")),
    provisioningProfile: JSON.parse(readFileSync(args["provisioning-profile"], "utf8")),
    certificateSerials: JSON.parse(readFileSync(args["certificate-serials"], "utf8")),
    signerCertificateSerial: readFileSync(args["signer-certificate-serial"], "utf8").trim(),
  });
  if (args.output) writeFileSync(args.output, `${JSON.stringify(evidence, null, 2)}\n`);
  else console.log(JSON.stringify(evidence, null, 2));
}
