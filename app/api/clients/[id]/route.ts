import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

async function getMembership(userId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: { userId },
  });
  return membership;
}

async function findClientForBusiness(id: string, businessId: string) {
  return prisma.client.findFirst({
    where: { id, businessId, deletedAt: null },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const membership = await getMembership(session.user.id);
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await findClientForBusiness(id, membership.businessId);
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Client not found" },
        { status: 404 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0].message },
        { status: 422 },
      );
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (err) {
    console.error("[clients/id] PATCH error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json(
        { data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const membership = await getMembership(session.user.id);
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await findClientForBusiness(id, membership.businessId);
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Client not found" },
        { status: 404 },
      );
    }

    // Soft delete — never hard delete clients, they have visit history
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error("[clients/id] DELETE error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
