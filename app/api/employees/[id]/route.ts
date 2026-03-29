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

const updateRoleSchema = z.object({
  role: z.enum(["admin", "staff"]),
});

// ---------------------------------------------------------------------------
// PATCH /api/employees/[id]
// Updates role on BusinessMember. [id] is BusinessMember.id.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  // Verify the member belongs to this business
  const target = await prisma.businessMember.findFirst({
    where: { id, businessId: adminMembership.businessId },
  });

  if (!target) {
    return NextResponse.json(
      { data: null, error: "Employee not found" },
      { status: 404 },
    );
  }

  // Guard: cannot change your own role
  if (target.userId === session.user.id) {
    return NextResponse.json(
      { data: null, error: "You cannot change your own role" },
      { status: 400 },
    );
  }

  const updated = await prisma.businessMember.update({
    where: { id },
    data: { role: parsed.data.role },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: { member: updated }, error: null });
}

// ---------------------------------------------------------------------------
// DELETE /api/employees/[id]
// Removes BusinessMember only — User is preserved to keep visit history.
// Guards: cannot remove yourself, cannot remove the last admin.
// [id] is BusinessMember.id.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // Verify target belongs to this business
  const target = await prisma.businessMember.findFirst({
    where: { id, businessId: adminMembership.businessId },
  });

  if (!target) {
    return NextResponse.json(
      { data: null, error: "Employee not found" },
      { status: 404 },
    );
  }

  // Guard: cannot remove yourself
  if (target.userId === session.user.id) {
    return NextResponse.json(
      { data: null, error: "You cannot remove yourself" },
      { status: 400 },
    );
  }

  // Guard: cannot remove the last admin
  if (target.role === "admin") {
    const adminCount = await prisma.businessMember.count({
      where: { businessId: adminMembership.businessId, role: "admin" },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { data: null, error: "Cannot remove the last admin" },
        { status: 400 },
      );
    }
  }

  // Desvincular — delete BusinessMember only, User stays for visit history
  await prisma.businessMember.delete({ where: { id } });

  return NextResponse.json({ data: { id }, error: null });
}
