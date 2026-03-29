import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ROLE_COOKIE = "cf-role";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Called immediately after login to persist the user's role in a cookie.
 * This allows middleware to do role-based redirects without hitting the DB.
 */
export async function POST() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { data: null, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const role = session.role ?? "staff";

  const response = NextResponse.json({ data: { role }, error: null });

  response.cookies.set(ROLE_COOKIE, role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
