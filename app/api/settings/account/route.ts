import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateAccountSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    email: z.string().email("Invalid email").optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
  })
  .refine(
    (data) => {
      // If newPassword is provided, currentPassword is required
      if (data.newPassword && !data.currentPassword) return false;
      return true;
    },
    { message: "Current password is required to set a new password" },
  );

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
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

  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  // Check email not already taken by another user
  if (email && email !== session.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { data: null, error: "Email is already in use" },
        { status: 409 },
      );
    }
  }

  // Handle password change
  if (newPassword && currentPassword) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.password) {
      return NextResponse.json(
        { data: null, error: "No password set on this account" },
        { status: 400 },
      );
    }

    // Verify current password using Better Auth's internal hasher
    const ctx = await auth.$context;
    const isValid = await ctx.password.verify({
      hash: user.password,
      password: currentPassword,
    });

    if (!isValid) {
      return NextResponse.json(
        { data: null, error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const hashedNew = await ctx.password.hash(newPassword);

    // Update password in both User and Account (Better Auth stores it in both)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedNew },
      }),
      prisma.account.updateMany({
        where: { userId: session.user.id, providerId: "credential" },
        data: { password: hashedNew },
      }),
    ]);
  }

  // Update name and/or email
  const userUpdates: { name?: string; email?: string } = {};
  if (name) userUpdates.name = name;
  if (email) userUpdates.email = email;

  const user =
    Object.keys(userUpdates).length > 0
      ? await prisma.user.update({
          where: { id: session.user.id },
          data: userUpdates,
          select: { id: true, name: true, email: true },
        })
      : await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true },
        });

  return NextResponse.json({ data: { user }, error: null });
}
