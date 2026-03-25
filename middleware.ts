import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login"];

// Better Auth API prefix — always public
const AUTH_API_PREFIX = "/api/auth";

// Routes only accessible by admin role
// NOTE: role check here is shallow (cookie-based).
// Deep role validation happens server-side in each layout/route.
const STAFF_BLOCKED_ROUTES = [
  "/employees",
  "/reports",
  "/settings",
  "/clients",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthApiRoute(pathname: string): boolean {
  return pathname.startsWith(AUTH_API_PREFIX);
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

/**
 * Next.js 16 proxy (file must be named middleware.ts due to confirmed
 * Next.js 16 bug on some platforms — see: github.com/vercel/next.js/issues/85243)
 *
 * This proxy is intentionally lightweight — it only checks for the
 * presence of the Better Auth session cookie.
 *
 * Deep session validation (role, businessId) happens server-side
 * in app/(dashboard)/layout.tsx and individual route handlers.
 *
 * IMPORTANT: Never import Prisma, auth, or any heavy module here.
 * The proxy bundle is separate from the app bundle.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through: static assets, Next.js internals
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Pass through: Better Auth API (handles its own auth)
  if (isAuthApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie (lightweight — no DB call)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthenticated = Boolean(sessionCookie?.value);

  // Not authenticated → redirect to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → redirect away from login
  if (isAuthenticated && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Export as both names for compatibility
export { proxy as middleware };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
