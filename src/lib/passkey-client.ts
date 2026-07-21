export function toBase64url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer;
}

export function decodeRegistrationOptions(options: PublicKeyCredentialCreationOptions & { challenge: string; user: PublicKeyCredentialUserEntity & { id: string }; excludeCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }> }) {
  return {
    ...options,
    challenge: fromBase64url(options.challenge),
    user: { ...options.user, id: fromBase64url(options.user.id) },
    excludeCredentials: options.excludeCredentials?.map((credential) => ({ ...credential, id: fromBase64url(String(credential.id)) })),
  };
}

export function serializeRegistrationCredential(credential: PublicKeyCredential, name: string) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    transports: typeof response.getTransports === "function" ? response.getTransports() : [],
    name,
    response: {
      attestationObject: toBase64url(response.attestationObject),
      clientDataJSON: toBase64url(response.clientDataJSON),
      authenticatorData: toBase64url(response.getAuthenticatorData()),
    },
  };
}

export function defaultPasskeyName() {
  const ua = navigator.userAgent;
  const os = /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS/i.test(ua) ? "Mac" : /iPhone/i.test(ua) ? "iPhone" : /Android/i.test(ua) ? "Android" : "Device";
  const browser = /Edg\//.test(ua) ? "Microsoft Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "browser";
  return os === "iPhone" ? "iPhone" : os === "Windows" ? "Windows Hello" : `${browser} on ${os}`;
}

export function passkeysSupported() {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential && navigator.credentials?.create);
}
