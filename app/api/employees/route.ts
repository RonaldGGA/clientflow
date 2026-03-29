import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminMembership(userId: string) {
  return prisma.businessMember.findFirst({
    where: { userId, role: "admin" },
  });
}

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "staff"]),
});

// ---------------------------------------------------------------------------
// GET /api/employees
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminMembership = await getAdminMembership(session.user.id);

  if (!adminMembership) {
    return NextResponse.json(
      { data: null, error: "Forbidden" },
      { status: 403 },
    );
  }

  const members = await prisma.businessMember.findMany({
    where: { businessId: adminMembership.businessId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ data: { members }, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/employees
// Creates User + Account + BusinessMember in a transaction.
// Does NOT use auth.api.signUpEmail — that method creates a new session and
// overwrites the admin's cookies, effectively logging them out.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminMembership = await getAdminMembership(session.user.id);

  if (!adminMembership) {
    return NextResponse.json(
      { data: null, error: "Forbidden" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { data: null, error: "Email is already in use" },
      { status: 409 },
    );
  }

  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);

  const businessMember = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        password: hashedPassword,
      },
    });

    // Better Auth stores credentials with accountId = userId, providerId = "credential"
    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    return tx.businessMember.create({
      data: {
        userId: user.id,
        businessId: adminMembership.businessId,
        role,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });

  return NextResponse.json(
    { data: { member: businessMember }, error: null },
    { status: 201 },
  );
}
