import { withAuth } from "next-auth/middleware";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "tinkal_erp_production_auth_secure_fallback_secret_key_2026";

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
     * - api/ (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static files: png, jpg, jpeg, gif, webp, svg, ico, pdf, woff, woff2, ttf
     * - favicon.ico, manifest.json, manifest.webmanifest, sw.js
     * - brand-logo, logo
     * - login (public login page)
     * - register (public registration page)
     * - pricing (public SaaS pricing page)
     * - portal (public customer portal)
     * - scan (mobile wireless scanner page)
     * - catalog, downloads
     */
    "/((?!api/|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|woff|woff2|ttf)$|favicon.ico|brand-logo|logo|manifest.json|manifest.webmanifest|sw.js|login|register|pricing|portal|scan|catalog|downloads|landing).*)",
  ],
};
