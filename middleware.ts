import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login"];

// Better Auth API prefix — always public
const AUTH_API_PREFIX = "/api/auth";

// Routes staff cannot access — admin only
const ADMIN_ONLY_ROUTES = [
  "/employees",
  "/reports",
  "/settings",
  "/clients",
  "/",
];

const SESSION_COOKIE = "better-auth.session_token";
const SESSION_COOKIE_SECURE = "__Secure-better-auth.session_token";
const ROLE_COOKIE = "cf-role";

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

function isAdminOnlyRoute(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Next.js 16 proxy — lightweight, no DB calls.
 *
 * Authentication: checked via Better Auth session cookie.
 * Authorization: checked via cf-role cookie (set by /api/auth/session-init after login).
 *
 * Deep validation (expiry, tampering) happens server-side in layouts and route handlers.
 */
export function proxy(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;

  // Pass through: static assets and Next.js internals
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }
  // response.headers.set(
  //   "Cache-Control",
  //   "no-store, no-cache, must-revalidate, private",
  // );
  // response.headers.set("Pragma", "no-cache");

  // Pass through: Better Auth API routes
  if (isAuthApiRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get(SESSION_COOKIE) ??
    request.cookies.get(SESSION_COOKIE_SECURE);

  const isAuthenticated = Boolean(sessionCookie?.value);
  const role = request.cookies.get(ROLE_COOKIE)?.value ?? null;

  // Not authenticated → redirect to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → redirect away from login
  if (isAuthenticated && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Staff role → block access to admin-only routes
  if (isAuthenticated && role === "staff" && isAdminOnlyRoute(pathname)) {
    return NextResponse.redirect(new URL("/visits", request.url));
  }

  return NextResponse.next();
}

// Export as both names for Next.js 16 compatibility on Windows
export { proxy as middleware };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
