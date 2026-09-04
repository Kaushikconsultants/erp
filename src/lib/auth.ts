import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "@/lib/ensureDefaultOrg";
import bcrypt from "bcryptjs";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "4f8b9e2c1a7d6e5f3b2a1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f";

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
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

        const inputEmail = credentials.email.trim();
        let user = await prisma.user.findFirst({
          where: { 
            email: { equals: inputEmail, mode: 'insensitive' }
          },
          include: { organization: true }
        });

        // Auto-seed default root organization and Super Admin on fresh database
        if (!user && (inputEmail.toLowerCase() === "admin@company.com" || inputEmail.toLowerCase() === "clothingespon@gmail.com") && credentials.password === "admin123") {
          await ensureDefaultOrganization();
          user = await prisma.user.findFirst({
            where: { 
              email: { equals: inputEmail, mode: 'insensitive' }
            },
            include: { organization: true }
          });
        }

        if (!user || !user.password) {
          return null;
        }

        if (user.isActive === false) {
          throw new Error("Your account has been deactivated. Please contact your system administrator.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl || user.image,
          avatarUrl: user.avatarUrl || user.image,
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
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) {
          return url;
        }
      } catch {
        // ignore
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.sub = user.id;
        token.image = (user as any).image || (user as any).avatarUrl;
        token.avatarUrl = (user as any).avatarUrl || (user as any).image;
        token.canManageSettings = (user as any).canManageSettings;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
        token.organizationSlug = (user as any).organizationSlug;
        token.subscriptionPlan = (user as any).subscriptionPlan;
        token.subscriptionStatus = (user as any).subscriptionStatus;
      }
      if (trigger === "update" && updateSession) {
        if (updateSession.name) token.name = updateSession.name;
        if (updateSession.email) token.email = updateSession.email;
        if (updateSession.avatarUrl !== undefined) {
          token.avatarUrl = updateSession.avatarUrl;
          token.picture = updateSession.avatarUrl;
          token.image = updateSession.avatarUrl;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id || (token.sub as string);
        session.user.image = (token.avatarUrl as string) || (token.image as string) || (token.picture as string);
        (session.user as any).avatarUrl = (token.avatarUrl as string) || (token.image as string);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
