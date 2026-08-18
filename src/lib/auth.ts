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
          where: { email: credentials.email }
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
        // Allows callback URLs on the same origin or Vercel deployments
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

      // Allow dynamic localhost ports in development
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).canManageSettings = token.canManageSettings;
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
