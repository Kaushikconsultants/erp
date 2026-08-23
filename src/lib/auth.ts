import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@company.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          canManageSettings: user.canManageSettings,
          organizationId: user.organizationId || user.organization?.id,
          organizationName: user.organization?.name,
          organizationSlug: user.organization?.slug,
          subscriptionPlan: user.organization?.subscriptionPlan || "GROWTH",
          subscriptionStatus: user.organization?.subscriptionStatus || "ACTIVE"
        };
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const isLocalhost = baseUrl.includes("localhost");
      const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
      const effectiveBaseUrl = (isLocalhost && vercelHost)
        ? `https://${vercelHost}`
        : baseUrl;

      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${effectiveBaseUrl}${url}`;
      }

      try {
        const targetUrl = new URL(url);
        if (
          targetUrl.origin === baseUrl ||
          targetUrl.origin === effectiveBaseUrl ||
          targetUrl.hostname.endsWith(".vercel.app")
        ) {
          return url;
        }
      } catch {
        // ignore invalid URL
      }

      if (process.env.NODE_ENV === "development" && url.startsWith("http://localhost:")) {
        return url;
      }

      return effectiveBaseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.canManageSettings = (user as any).canManageSettings;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationSlug = (user as any).organizationSlug;
        token.subscriptionPlan = (user as any).subscriptionPlan;
        token.subscriptionStatus = (user as any).subscriptionStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).canManageSettings = token.canManageSettings;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        (session.user as any).organizationSlug = token.organizationSlug;
        (session.user as any).subscriptionPlan = token.subscriptionPlan;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
};
