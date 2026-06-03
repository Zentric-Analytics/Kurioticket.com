import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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

import {
  EmailVerificationCooldownError,
  getEmailVerificationRedirect,
  sendEmailVerificationCode,
  verifyLoginCode,
} from "@/services/emailVerificationService";

import { logAuthEvent } from "@/services/authService";

type SessionAugmentedUser = {
  role?: string;
  isPremium?: boolean;
  status?: string;
  emailVerified?: Date | string | null;
};

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
          user.status !==
            "ACTIVE" ||
          !user.emailVerified
        ) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isPremium:
            user.isPremium,
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
        user.status !== "ACTIVE"
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
        isPremium:
          user.isPremium,
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
          dbUser.status !==
            "ACTIVE"
        ) {
          return "/auth/signin?error=AccountUnavailable";
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
          adminEmails.includes(
            email
          )
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
      }) {
        if (user) {
          const authUser =
            user as typeof user &
              SessionAugmentedUser;
          token.id = user.id;

          token.role =
            authUser.role ||
            "USER";

          token.isPremium =
            Boolean(
              authUser.isPremium
            );

          token.status =
            authUser.status ||
            "ACTIVE";

          token.emailVerified =
            Boolean(
              authUser.emailVerified
            );
        }

        if (
          token.email &&
          isDatabaseConfigured()
        ) {
          const dbUser =
            await getPrisma().user.findUnique(
              {
                where: {
                  email:
                    token.email.toLowerCase(),
                },
              }
            );

          if (dbUser) {
            token.id =
              dbUser.id;

            token.role =
              dbUser.role;

            token.isPremium =
              dbUser.isPremium;

            token.status =
              dbUser.status;

            token.emailVerified =
              Boolean(
                dbUser.emailVerified
              );
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

          session.user.role =
            String(
              token.role ||
                "USER"
            );

          session.user.isPremium =
            Boolean(
              token.isPremium
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
        }

        return session;
      },
    },
  };
