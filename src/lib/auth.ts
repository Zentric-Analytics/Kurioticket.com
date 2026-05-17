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
        throw new Error("Enter a valid email address and password.");
      }

      const { email, password } = parsed.data;
      const user = await getPrisma().user.findUnique({ where: { email } });
      if (!user?.passwordHash) {
        throw new Error("No password account exists for this email.");
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error("Incorrect email or password.");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        isPremium: user.isPremium,
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
  adapter: isDatabaseConfigured() ? PrismaAdapter(getPrisma() as never) : undefined,
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

      const adminEmails = getAdminEmails();
      if (adminEmails.includes(email) && isDatabaseConfigured()) {
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
        token.isPremium = Boolean((user as { isPremium?: boolean }).isPremium);
      }

      if (token.email && isDatabaseConfigured()) {
        const email = token.email.toLowerCase();
        const adminEmails = getAdminEmails();
        const dbUser = await getPrisma().user.findUnique({
          where: { email },
          select: { id: true, role: true, isPremium: true },
        });
        if (dbUser) {
          const role = adminEmails.includes(email) ? "ADMIN" : dbUser.role;
          if (role === "ADMIN" && dbUser.role !== "ADMIN") {
            await getPrisma().user.update({ where: { id: dbUser.id }, data: { role: "ADMIN" } });
          }
          token.id = dbUser.id;
          token.role = role;
          token.isPremium = dbUser.isPremium;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "");
        session.user.role = String(token.role || "USER");
        session.user.isPremium = Boolean(token.isPremium);
      }
      return session;
    },
  },
};
