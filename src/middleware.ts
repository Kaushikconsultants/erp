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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (public login page)
     * - scan (mobile wireless scanner page)
     */
    "/((?!api/auth|api/whatsapp/clear-dummy|_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|login|scan).*)",
  ],
};
