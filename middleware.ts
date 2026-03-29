import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];
const AUTH_API_PREFIX = "/api/auth";

const ADMIN_ONLY_PAGE_ROUTES = ["/", "/employees", "/reports", "/settings"];

const ADMIN_ONLY_API_ROUTES = [
  "/api/dashboard",
  "/api/services",
  "/api/employees",
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

function isAdminOnlyPage(pathname: string): boolean {
  return ADMIN_ONLY_PAGE_ROUTES.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  });
}

function isAdminOnlyApi(pathname: string): boolean {
  return ADMIN_ONLY_API_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();
  if (isAuthApiRoute(pathname)) return NextResponse.next();

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

  if (isAuthenticated && role === "staff") {
    // API routes → return 403, never redirect
    if (isAdminOnlyApi(pathname)) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Page routes → redirect to visits
    if (isAdminOnlyPage(pathname)) {
      return NextResponse.redirect(new URL("/visits", request.url));
    }
  }

  return NextResponse.next();
}

export { proxy as middleware };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
