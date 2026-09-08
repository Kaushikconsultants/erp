# Heart Of Business

A Next.js CRM and ERP application backed by PostgreSQL and Prisma.

## Local development

Install dependencies, configure the environment, then run `npm run dev`.

## Authentication and security configuration

Authentication uses NextAuth credentials sessions. Production requires the following environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET` — generate a unique, high-entropy value for every environment.

The app refuses to start in production without `NEXTAUTH_SECRET`. Never commit secrets or substitute a known fallback.

### Controlled bootstrap

`BOOTSTRAP_ADMIN_PASSWORD` is required only when intentionally creating the legacy root organization and its initial administrators. Set it to a unique, high-entropy value only for that one-time operation, then remove it. The sign-in endpoint never bootstraps accounts.

## Operational requirements

- Rotate `NEXTAUTH_SECRET` if it was ever deployed without an environment-specific value. This invalidates existing sessions.
- Disable a user in the database to prevent new sign-ins; server-session validation also rejects inactive or deleted users.
- Treat the mobile MPIN lock as a convenience layer, not authorization. APIs and server actions must always validate the NextAuth session and tenant context.
- Configure a shared login rate limiter and an MFA provider before exposing this service to the public internet.

## Verification

Run `npm run build` with production environment variables configured. Exercise login, logout, account deactivation, disabled users, protected-route redirects, registration, and tenant isolation before deployment.
