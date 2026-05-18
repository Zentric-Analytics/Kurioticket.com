import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getAdminEmails, getAuthSecret } from "@/lib/env";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { signinSchema } from "@/lib/validation";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",

    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },

    async authorize(credentials) {
      const parsed = signinSchema.safeParse(credentials);

      if (!parsed.success) {
        console.error("[auth:credentials-validation]", parsed.error.flatten().fieldErrors);
        return null;
      }

      const { email, password } = parsed.data;

      const user = await getPrisma().user.findUnique({
        where: { email },
      });

      if (!user?.passwordHash) {
        console.error("[auth:credentials-user-missing]", { email });
        return null;
      }

      if (user.status !== "ACTIVE") {
        console.error("[auth:credentials-account-unavailable]", {
          email,
          status: user.status,
        });

        throw new Error("This account is not available. Please contact support.");
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        console.error("[auth:credentials-invalid-password]", { email });
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPremium: user.isPremium,
        status: user.status,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: isDatabaseConfigured()
    ? PrismaAdapter(getPrisma() as never)
    : undefined,

  providers,

  secret: getAuthSecret() || undefined,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding",
  },

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();

      if (!email) return false;

      if (!isDatabaseConfigured()) return true;

      const dbUser = await getPrisma().user.findUnique({
        where: { email },
        select: {
          id: true,
          status: true,
          role: true,
        },
      });

      if (dbUser?.status && dbUser.status !== "ACTIVE") {
        console.error("[auth:signin-account-unavailable]", {
          email,
          status: dbUser.status,
        });

        return "/auth/signin?error=AccountUnavailable";
      }

      const adminEmails = getAdminEmails();

      if (adminEmails.includes(email)) {
        await getPrisma().user.updateMany({
          where: { email },
          data: { role: "ADMIN" },
        });

        user.role = "ADMIN";
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "USER";

        token.isPremium = Boolean(
          (user as { isPremium?: boolean }).isPremium,
        );

        token.status = (user as { status?: string }).status || "ACTIVE";
      }

      if (token.email && isDatabaseConfigured()) {
        const email = token.email.toLowerCase();
        const adminEmails = getAdminEmails();

        const dbUser = await getPrisma().user.findUnique({
          where: { email },

          select: {
            id: true,
            role: true,
            isPremium: true,
            status: true,
          },
        });

        if (dbUser) {
          const role = adminEmails.includes(email)
            ? "ADMIN"
            : dbUser.role;

          if (role === "ADMIN" && dbUser.role !== "ADMIN") {
            await getPrisma().user.update({
              where: { id: dbUser.id },
              data: { role: "ADMIN" },
            });
          }

          token.id = dbUser.id;
          token.role = role;
          token.isPremium = dbUser.isPremium;
          token.status = dbUser.status;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "");
        session.user.role = String(token.role || "USER");
        session.user.isPremium = Boolean(token.isPremium);
        session.user.status = String(token.status || "ACTIVE");
      }

      return session;
    },
  },
};