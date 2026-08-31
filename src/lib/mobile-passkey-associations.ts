type AssociationEnvironment = Pick<NodeJS.ProcessEnv,
  "WEBAUTHN_IOS_APP_IDS" | "WEBAUTHN_ANDROID_PACKAGE_NAME" | "WEBAUTHN_ANDROID_CERT_SHA256"
>;

const appleApplicationIdentifier = /^[A-Z0-9]{10}\.[A-Za-z0-9][A-Za-z0-9.-]*$/;
const androidPackageName = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const androidCertificateFingerprint = /^(?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;

function uniqueCsv(value: string | undefined): string[] {
  return [...new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

export function appleAppSiteAssociation(environment: AssociationEnvironment = process.env) {
  const apps = uniqueCsv(environment.WEBAUTHN_IOS_APP_IDS);
  if (!apps.length || apps.some((app) => !appleApplicationIdentifier.test(app))) return null;
  return { webcredentials: { apps } };
}

export function androidAssetLinks(environment: AssociationEnvironment = process.env) {
  const packageName = environment.WEBAUTHN_ANDROID_PACKAGE_NAME?.trim() ?? "";
  const fingerprints = uniqueCsv(environment.WEBAUTHN_ANDROID_CERT_SHA256).map((value) => value.toUpperCase());
  if (!androidPackageName.test(packageName) || !fingerprints.length || fingerprints.some((value) => !androidCertificateFingerprint.test(value))) return null;
  return [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
