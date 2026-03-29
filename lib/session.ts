import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  businessId: string | null;
  role: string | null;
}

/**
 * Reads the session in a Server Component, Layout, or Route Handler.
 *
 * Uses next/headers — only call this in server context.
 * Never import this in middleware.ts or client components.
 * Returns null if the user is not authenticated.
 */
export async function getServerSession(): Promise<SessionUser | null> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();

    const session = await auth.api.getSession({
      headers: headersList,
    });

    console.log("SERVER SESSION 1:", session?.user?.email ?? "NULL");

    if (!session?.user) return null;
    console.log("SERVER SESSION 2:", session?.user?.email ?? "NULL");

    // @@unique([businessId, userId]) — findFirst is safe here,
    // but we use the compound unique for clarity
    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id },
      select: { role: true, businessId: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      businessId: membership?.businessId ?? null,
      role: membership?.role ?? null,
    };
  } catch (e) {
    console.error("getServerSession error:", e);
    return null;
  }
}
