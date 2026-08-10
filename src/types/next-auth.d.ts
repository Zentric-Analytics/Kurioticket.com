import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      status: string;
      emailVerified: boolean;
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
      accountSessionId?: string;
      assuranceLevel?: "PRIMARY" | "MFA" | "PHISHING_RESISTANT";
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    status?: string;
    emailVerified?:
      | Date
      | string
      | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    status?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    previewAuthMethod?: "credentials" | "google";
    accountSessionId?: string;
    sessionVersion?: number;
    authMethod?: "PASSWORD" | "EMAIL_CODE" | "GOOGLE" | "PASSKEY" | "UNKNOWN";
    assuranceLevel?: "PRIMARY" | "MFA" | "PHISHING_RESISTANT";
  }
}
