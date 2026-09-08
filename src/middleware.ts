import { withAuth } from "next-auth/middleware";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

if (process.env.NODE_ENV === "production" && !NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be configured in production.");
}

export default withAuth({
  secret: NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => Boolean(token?.sub && token.isActive !== false),
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - api/testdb
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json / manifest.webmanifest / sw.js
     * - login (public login page)
     * - register (public registration page)
     * - pricing (public SaaS pricing page)
     * - portal (public customer portal)
     * - scan (mobile wireless scanner page)
     */
    "/((?!api/auth|api/webhooks|api/testdb|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|login|register|pricing|portal|scan|catalog|downloads).*)",
  ],
};
