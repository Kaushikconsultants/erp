import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - api/whatsapp/webhook
     * - api/testdb
     * - api/whatsapp/clear-dummy
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
    "/((?!api/auth|api/whatsapp/webhook|api/testdb|api/whatsapp/clear-dummy|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|login|register|pricing|portal|scan).*)",
  ],
};
