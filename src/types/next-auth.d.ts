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
    sessionActivityId?: string;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  }
}