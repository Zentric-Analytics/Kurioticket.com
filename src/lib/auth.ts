import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import {
  getAdminEmails,
  getAuthSecret,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/env";

import {
  AuthRateLimitError,
  checkAuthRateLimit,
} from "@/lib/auth-rate-limit";

import {
  isGoogleAuthConfigured,
  logSafeAuthDiagnostics,
} from "@/lib/auth-diagnostics";

import {
  getPrisma,
  isDatabaseConfigured,
} from "@/lib/prisma";

import { signinSchema } from "@/lib/validation";
import { isPasskeyLoginToken, passkeyStrongAuthNote } from "@/lib/passkeys";
import { assertStagingAuthenticationSafety, isStagingEnvironment } from "@/lib/stagingSafety";
import { canRetainStagingSession, canUseStagingCredentials, canUseStagingGoogle, isTrustedPreviewCompanyEmail } from "@/lib/previewTesterAccess";

import {
  EmailVerificationCooldownError,
  getEmailVerificationRedirect,
  sendEmailVerificationCode,
  verifyLoginCode,
} from "@/services/emailVerificationService";

import { logAuthEvent } from "@/services/authService";
import { createAccountSession, validateAccountSession } from "@/lib/account-session";

assertStagingAuthenticationSafety();

type SessionAugmentedUser = {
  role?: string;
  status?: string;
  emailVerified?: Date | string | null;
  passkeyStrongAuth?: boolean;
};

type JwtUpdateSession = {
  twoFactorVerified?: boolean;
};

async function isPendingDeletionLoginAllowed(userId: string) {
  const request = await getPrisma().accountDeletionRequest.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "READY_FOR_REVIEW"] },
      cancelledAt: null,
      completedAt: null,
      deletionScheduledAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return Boolean(request);
}

async function isAuthenticatableUserStatus(user: { id: string; status: string }) {
  if (user.status === "ACTIVE") {
    return true;
  }

  if (user.status === "PENDING_DELETION") {
    return isPendingDeletionLoginAllowed(user.id);
  }

  return false;
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Credentials",

    credentials: {
      email: {
        label: "Email",
        type: "email",
      },

      password: {
        label: "Password",
        type: "password",
      },

      loginCode: {
        label: "Login code",
        type: "text",
      },

      passkeyLoginToken: {
        label: "Passkey login token",
        type: "text",
      },
    },

    async authorize(
      credentials,
      request
    ) {
      const rateLimitRequest =
        request
          ? ({
              headers: new Headers(
                request.headers as HeadersInit
              ),
            } as Request)
          : undefined;

      const passkeyLoginToken = String(credentials?.passkeyLoginToken || "").trim();

      if (passkeyLoginToken && isPasskeyLoginToken(passkeyLoginToken)) {
        const challenge = await getPrisma().webAuthnChallenge.findFirst({
          where: { loginToken: passkeyLoginToken, type: "authentication", consumedAt: { not: null }, expiresAt: { gt: new Date() } },
          include: { user: true },
        });

        if (!challenge?.user || !(await isAuthenticatableUserStatus(challenge.user)) || !challenge.user.emailVerified || !challenge.user.email || !(await canUseStagingCredentials(challenge.user.email))) return null;

        await getPrisma().webAuthnChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date() } });
        logAuthEvent("passkey-login-strong-auth", { userId: challenge.user.id, note: passkeyStrongAuthNote });

        return {
          id: challenge.user.id, email: challenge.user.email, name: challenge.user.name, image: challenge.user.image,
          role: challenge.user.role, status: challenge.user.status, emailVerified: challenge.user.emailVerified, passkeyStrongAuth: true,
        };
      }

      const loginCode = String(
        credentials?.loginCode || ""
      ).trim();

      if (loginCode) {
        const parsedEmail =
          signinSchema.shape.email.safeParse(
            String(
              credentials?.email || ""
            )
          );

        if (
          !parsedEmail.success ||
          !/^\d{6}$/.test(loginCode)
        ) {
          return null;
        }

        const email =
          parsedEmail.data;

        try {
          checkAuthRateLimit({
            action: "verify-login",
            email,
            request:
              rateLimitRequest,
            limit: 10,
            windowMs:
              15 * 60 * 1000,
          });
        } catch (error) {
          if (
            error instanceof
            AuthRateLimitError
          ) {
            throw new Error(
              "RateLimited"
            );
          }

          throw error;
        }

        const validCode =
          await verifyLoginCode({
            email,
            code: loginCode,
          });

        if (!validCode) {
          return null;
        }

        const user =
          await getPrisma().user.findUnique(
            {
              where: { email },
            }
          );

        if (
          !user ||
          !(await isAuthenticatableUserStatus(user)) ||
          !user.emailVerified ||
          !(await canUseStagingCredentials(email))
        ) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          emailVerified:
            user.emailVerified,
        };
      }

      const parsed =
        signinSchema.safeParse(
          credentials
        );

      if (!parsed.success) {
        logSafeAuthDiagnostics(
          "[auth:credentials-validation-diagnostics]"
        );

        return null;
      }

      const {
        email,
        password,
      } = parsed.data;

      if (!(await canUseStagingCredentials(email))) return null;

      try {
        checkAuthRateLimit({
          action: "signin",
          email,
          request:
            rateLimitRequest,
          limit: 10,
          windowMs:
            15 * 60 * 1000,
        });
      } catch (error) {
        if (
          error instanceof
          AuthRateLimitError
        ) {
          throw new Error(
            "RateLimited"
          );
        }

        throw error;
      }

      const user =
        await getPrisma().user.findUnique(
          {
            where: { email },
          }
        );

      if (!user?.passwordHash) {
        logSafeAuthDiagnostics(
          "[auth:credentials-user-missing-diagnostics]",
          { email }
        );

        return null;
      }

      if (
        !(await isAuthenticatableUserStatus(user))
      ) {
        throw new Error(
          "AccountUnavailable"
        );
      }

      const valid =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!valid) {
        return null;
      }

      if (!user.emailVerified) {
        logAuthEvent(
          "login-blocked-unverified",
          { email }
        );

        try {
          await sendEmailVerificationCode(
            {
              email,
              name: user.name,
              action: "credentials-unverified-email",
              enforceCooldown: true,
            }
          );
        } catch (error) {
          if (!(error instanceof EmailVerificationCooldownError)) {
            throw error;
          }
        }

        throw new Error(
          "EmailVerificationRequired"
        );
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        status: user.status,
        emailVerified:
          user.emailVerified,
      };
    },
  }),
];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId:
        getGoogleClientId(),

      clientSecret:
        getGoogleClientSecret(),

      authorization: {
        params: {
          prompt:
            "select_account",
          response_type:
            "code",
        },
      },

      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified
            ? new Date()
            : null,
        };
      },

      allowDangerousEmailAccountLinking:
        true,
    })
  );
}

export const authOptions: NextAuthOptions =
  {
    adapter:
      isDatabaseConfigured()
        ? (PrismaAdapter(
            getPrisma()
          ) as Adapter)
        : undefined,

    providers,

    secret:
      getAuthSecret() ||
      undefined,

    session: {
      strategy: "jwt",
      maxAge: 8 * 60 * 60,
      updateAge: 60 * 60,
    },

    jwt: {
      maxAge: 8 * 60 * 60,
    },

    pages: {
      signIn:
        "/auth/signin",

      newUser:
        "/onboarding",
    },

    callbacks: {
      async signIn({
        user,
        account,
        profile,
      }) {
        const email =
          user.email
            ?.toLowerCase()
            .trim();

        if (!email) {
          return false;
        }

        if (
          !isDatabaseConfigured()
        ) {
          return true;
        }

        const dbUser =
          await getPrisma().user.findUnique(
            {
              where: {
                email,
              },
            }
          );

        if (
          dbUser?.status &&
          !(await isAuthenticatableUserStatus(dbUser))
        ) {
          return "/auth/signin?error=AccountUnavailable";
        }

        if (dbUser?.status === "PENDING_DELETION") {
          return "/account/pending-deletion";
        }

        const isGoogleSignIn =
          account?.provider ===
          "google";

        const googleVerified =
          Boolean(
            (
              profile as
                | {
                    email_verified?: boolean;
                  }
                | undefined
            )?.email_verified
          );

        if (isGoogleSignIn && !(await canUseStagingGoogle(email, googleVerified))) {
          return "/auth/signin?error=PreviewAccessRequired";
        }

        if (
          dbUser &&
          !dbUser.emailVerified
        ) {
          if (
            isGoogleSignIn &&
            googleVerified
          ) {
            await getPrisma().user.update(
              {
                where: {
                  id: dbUser.id,
                },

                data: {
                  emailVerified:
                    new Date(),
                },
              }
            );
          } else {
            logAuthEvent(
              "login-blocked-unverified",
              { email }
            );

            try {
              await sendEmailVerificationCode(
                {
                  email,
                  name: dbUser.name,
                  action: "oauth-unverified-email",
                  enforceCooldown: true,
                }
              );
            } catch (error) {
              if (!(error instanceof EmailVerificationCooldownError)) {
                throw error;
              }
            }

            return getEmailVerificationRedirect(
              email
            );
          }
        }

        const adminEmails =
          getAdminEmails();

        if (
          adminEmails.includes(email) &&
          (!isStagingEnvironment() || isTrustedPreviewCompanyEmail(email))
        ) {
          await getPrisma().user.updateMany(
            {
              where: {
                email,
              },

              data: {
                role: "ADMIN",
              },
            }
          );

          user.role = "ADMIN";
        }

        return true;
      },

      async jwt({
        token,
        user,
        account,
        trigger,
        session,
      }) {
        if (trigger === "update") {
          const updateSession = session as JwtUpdateSession | undefined;
          if (updateSession?.twoFactorVerified === true && token.accountSessionId) {
            const verifiedSession = await validateAccountSession(token.accountSessionId, String(token.id), { requireCompletedTwoFactor: false });
            if (verifiedSession?.assuranceLevel === "MFA" || verifiedSession?.assuranceLevel === "PHISHING_RESISTANT") {
              token.twoFactorVerified = true;
              token.assuranceLevel = verifiedSession.assuranceLevel;
            }
          }
        }

        if (user) {
          token.previewAuthMethod = account?.provider === "google" ? "google" : "credentials";
          const authUser =
            user as typeof user &
              SessionAugmentedUser;
          token.id = user.id;

          token.role =
            authUser.role ||
            "USER";

          token.status =
            authUser.status ||
            "ACTIVE";

          token.emailVerified =
            Boolean(
              authUser.emailVerified
            );

          token.twoFactorVerified = true;
          token.authMethod = authUser.passkeyStrongAuth ? "PASSKEY" : account?.provider === "google" ? "GOOGLE" : "PASSWORD";
          token.assuranceLevel = authUser.passkeyStrongAuth ? "PHISHING_RESISTANT" : "PRIMARY";
        }

        if (
          (token.id || token.email) &&
          isDatabaseConfigured()
        ) {
          const dbUser =
            await getPrisma().user.findUnique(
              {
                where: token.id
                  ? { id: String(token.id) }
                  : { email: String(token.email).toLowerCase() },
                include: {
                  accounts: { select: { provider: true } },
                  securitySettings: {
                    select: {
                      twoFactorEnabled: true,
                    },
                  },
                },
              }
            );

          if (dbUser) {
            const previewAuthMethod = token.previewAuthMethod || (dbUser.accounts.some((linkedAccount) => linkedAccount.provider === "google") ? "google" : "credentials");
            const retainsPreviewAccess = await canRetainStagingSession(
              dbUser.email || "",
              previewAuthMethod === "google",
            );
            token.id =
              dbUser.id;

            token.role =
              dbUser.role;

            token.status =
              retainsPreviewAccess ? dbUser.status : "SUSPENDED";

            token.email =
              dbUser.email ||
              undefined;

            token.emailVerified =
              Boolean(
                dbUser.emailVerified
              );

            token.twoFactorEnabled =
              Boolean(
                dbUser.securitySettings?.twoFactorEnabled
              );

            if (token.twoFactorEnabled && user && !(user as SessionAugmentedUser).passkeyStrongAuth) {
              token.twoFactorVerified = false;
            }

            if (!token.twoFactorEnabled) {
              token.twoFactorVerified = true;
            }

            if (!token.accountSessionId) {
              const canonical = await createAccountSession({ userId: dbUser.id, client: "WEB", authMethod: token.authMethod || "UNKNOWN", assuranceLevel: token.assuranceLevel || "PRIMARY" });
              token.accountSessionId = canonical.id;
              token.sessionVersion = canonical.sessionVersion;
            } else if (token.accountSessionId) {
              const canonical = await validateAccountSession(token.accountSessionId, dbUser.id, { requireCompletedTwoFactor: false });
              if (!canonical) { token.status = "SUSPENDED"; token.twoFactorVerified = false; }
              else token.sessionVersion = canonical.sessionVersion;
            }
          }
        }

        return token;
      },

      async session({
        session,
        token,
      }) {
        if (session.user) {
          session.user.id =
            String(
              token.id || ""
            );

          session.user.email =
            typeof token.email === "string"
              ? token.email
              : session.user.email;

          session.user.role =
            String(
              token.role ||
                "USER"
            );

          session.user.status =
            String(
              token.status ||
                "ACTIVE"
            );

          session.user.emailVerified =
            Boolean(
              token.emailVerified
            );

          session.user.twoFactorEnabled =
            Boolean(
              token.twoFactorEnabled
            );

          session.user.twoFactorVerified =
            Boolean(
              token.twoFactorVerified
            );
          session.user.accountSessionId = token.accountSessionId;
          session.user.assuranceLevel = token.assuranceLevel;
        }

        return session;
      },
    },
  };
