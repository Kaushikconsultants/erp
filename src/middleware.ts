import { withAuth } from "next-auth/middleware";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "4f8b9e2c1a7d6e5f3b2a1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f";

export default withAuth({
  secret: NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
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
    "/((?!api/auth|api/webhooks|api/testdb|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|login|register|pricing|portal|scan).*)",
  ],
};
