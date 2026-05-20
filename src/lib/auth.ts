import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import {
  getAdminEmails,
  getAuthSecret,
} from "@/lib/env";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";

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
  getEmailVerificationRedirect,
  sendEmailVerificationCode,
  verifyLoginCode,
} from "@/services/emailVerificationService";
import { logAuthEvent } from "@/services/authService";

const providers: NextAuthOptions["providers"] =
  [
    CredentialsProvider({
      name: "Email and password",

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
      ) {
        const loginCode =
          String(
            credentials?.loginCode ||
              "",
          ).trim();

        if (loginCode) {
          const parsedEmail =
            signinSchema.shape.email.safeParse(
              String(
                credentials?.email ||
                  "",
              ),
            );

          if (
            !parsedEmail.success ||
            !/^\d{6}$/.test(
              loginCode,
            )
          ) {
            return null;
          }

          const email =
            parsedEmail.data;

          try {
            checkAuthRateLimit({ action: "verify-login", email, limit: 10, windowMs: 15 * 60 * 1000 });
          } catch (error) {
            if (error instanceof AuthRateLimitError) {
              throw new Error("RateLimited");
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
                where: {
                  email,
                },
              },
            );

          if (
            !user ||
            user.status !== "ACTIVE" ||
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
            credentials,
          );

        if (!parsed.success) {
          console.error(
            "[auth:credentials-validation]",
            parsed.error.flatten()
              .fieldErrors,
          );

          logSafeAuthDiagnostics(
            "[auth:credentials-validation-diagnostics]",
          );

          return null;
        }

        const { email, password } =
          parsed.data;

        try {
          checkAuthRateLimit({ action: "signin", email, limit: 10, windowMs: 15 * 60 * 1000 });
        } catch (error) {
          if (error instanceof AuthRateLimitError) {
            throw new Error("RateLimited");
          }

          throw error;
        }

        const user =
          await getPrisma().user.findUnique(
            {
              where: {
                email,
              },
            },
          );

        if (
          !user?.passwordHash
        ) {
          console.error(
            "[auth:credentials-user-missing]",
            { email },
          );

          logSafeAuthDiagnostics(
            "[auth:credentials-user-missing-diagnostics]",
            { email },
          );

          return null;
        }

        if (
          user.status !==
          "ACTIVE"
        ) {
          console.error(
            "[auth:credentials-account-unavailable]",
            {
              email,
              status:
                user.status,
            },
          );

          logSafeAuthDiagnostics(
            "[auth:credentials-account-unavailable-diagnostics]",
            {
              email,
              role:
                user.role,
              status:
                user.status,
            },
          );

          throw new Error(
            "This account is not available. Please contact support.",
          );
        }

        const valid =
          await bcrypt.compare(
            password,
            user.passwordHash,
          );

        if (!valid) {
          console.error(
            "[auth:credentials-invalid-password]",
            { email },
          );

          logSafeAuthDiagnostics(
            "[auth:credentials-invalid-password-diagnostics]",
            { email },
          );

          return null;
        }

        // Email verification enforcement
        if (
          !user.emailVerified
        ) {
          logAuthEvent("login-blocked-unverified", { email });

          await sendEmailVerificationCode(
            {
              email,
              name: user.name,
            },
          );

          throw new Error(
            "EmailVerificationRequired",
          );
        }

        throw new Error(
          "LoginVerificationRequired",
        );
      },
    }),
  ];

if (isGoogleAuthConfigured()) {
  providers.push(
    GoogleProvider({
      clientId:
        process.env
          .AUTH_GOOGLE_ID ||
        "",

      clientSecret:
        process.env
          .AUTH_GOOGLE_SECRET ||
        "",
    }),
  );
}

export const authOptions: NextAuthOptions =
  {
    adapter:
      isDatabaseConfigured()
        ? PrismaAdapter(
            getPrisma() as never,
          )
        : undefined,

    providers,

    secret:
      getAuthSecret() ||
      undefined,

    session: {
      strategy: "jwt",
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

              select: {
                id: true,
                status: true,
                role: true,
                emailVerified:
                  true,
                name: true,
              },
            },
          );

        if (
          dbUser?.status &&
          dbUser.status !==
            "ACTIVE"
        ) {
          console.error(
            "[auth:signin-account-unavailable]",
            {
              email,
              status:
                dbUser.status,
            },
          );

          logSafeAuthDiagnostics(
            "[auth:signin-account-unavailable-diagnostics]",
            {
              email,
              role:
                dbUser.role,
              status:
                dbUser.status,
            },
          );

          return "/auth/signin?error=AccountUnavailable";
        }

        // Email verification gate
        if (
          dbUser &&
          !dbUser.emailVerified
        ) {
          logAuthEvent("login-blocked-unverified", { email });

          await sendEmailVerificationCode(
            {
              email,
              name:
                dbUser.name,
            },
          );

          return getEmailVerificationRedirect(
            email,
          );
        }

        const adminEmails =
          getAdminEmails();

        if (
          adminEmails.includes(
            email,
          )
        ) {
          await getPrisma().user.updateMany(
            {
              where: {
                email,
              },

              data: {
                role:
                  "ADMIN",
              },
            },
          );

          user.role =
            "ADMIN";
        }

        return true;
      },

      async jwt({
        token,
        user,
      }) {
        if (user) {
          token.id =
            user.id;

          token.role =
            (
              user as {
                role?: string;
              }
            ).role ||
            "USER";

          token.isPremium =
            Boolean(
              (
                user as {
                  isPremium?: boolean;
                }
              ).isPremium,
            );

          token.status =
            (
              user as {
                status?: string;
              }
            ).status ||
            "ACTIVE";

          token.emailVerified =
            Boolean(
              (
                user as {
                  emailVerified?:
                    | Date
                    | string
                    | null;
                }
              )
                .emailVerified,
            );
        }

        if (
          token.email &&
          isDatabaseConfigured()
        ) {
          const email =
            token.email.toLowerCase();

          const adminEmails =
            getAdminEmails();

          const dbUser =
            await getPrisma().user.findUnique(
              {
                where: {
                  email,
                },

                select: {
                  id: true,
                  role: true,
                  isPremium:
                    true,
                  status: true,
                  emailVerified:
                    true,
                },
              },
            );

          if (dbUser) {
            const isAdminEmail =
              adminEmails.includes(
                email,
              );

            const role =
              isAdminEmail
                ? "ADMIN"
                : dbUser.role ===
                    "ADMIN"
                  ? "USER"
                  : dbUser.role;

            if (
              isAdminEmail &&
              dbUser.role !==
                "ADMIN"
            ) {
              await getPrisma().user.update(
                {
                  where: {
                    id: dbUser.id,
                  },

                  data: {
                    role:
                      "ADMIN",
                  },
                },
              );
            }

            token.id =
              dbUser.id;

            token.role =
              role;

            token.isPremium =
              dbUser.isPremium;

            token.status =
              dbUser.status;

            token.emailVerified =
              Boolean(
                dbUser.emailVerified,
              );
          }
        }

        return token;
      },

      async session({
        session,
        token,
      }) {
        if (
          session.user
        ) {
          session.user.id =
            String(
              token.id ||
                "",
            );

          session.user.role =
            String(
              token.role ||
                "USER",
            );

          session.user.isPremium =
            Boolean(
              token.isPremium,
            );

          session.user.status =
            String(
              token.status ||
                "ACTIVE",
            );

          session.user.emailVerified =
            Boolean(
              token.emailVerified,
            );
        }

        return session;
      },
    },
  };