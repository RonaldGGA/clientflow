import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  basePrice: z
    .number({ error: "Price must be a number" })
    .positive("Price must be greater than 0")
    .multipleOf(0.01, "Price can have at most 2 decimal places")
    .optional(),
});

async function getAdminMembership(userId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: { userId },
  });
  if (!membership || membership.role !== "admin") return null;
  return membership;
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

    const membership = await getAdminMembership(session.user.id);
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await prisma.service.findFirst({
      where: { id, businessId: membership.businessId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Service not found" },
        { status: 404 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0].message },
        { status: 422 },
      );
    }

    // Check duplicate name only if name is being changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.service.findFirst({
        where: {
          businessId: membership.businessId,
          name: { equals: parsed.data.name, mode: "insensitive" },
          deletedAt: null,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { data: null, error: "A service with this name already exists." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.basePrice !== undefined && {
          basePrice: parsed.data.basePrice,
        }),
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: { ...updated, basePrice: Number(updated.basePrice) },
      error: null,
    });
  } catch (err) {
    console.error("[services/id] PATCH error:", err);
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

    const membership = await getAdminMembership(session.user.id);
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const existing = await prisma.service.findFirst({
      where: { id, businessId: membership.businessId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { data: null, error: "Service not found" },
        { status: 404 },
      );
    }

    // Soft delete — visits reference this service, never hard delete
    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error("[services/id] DELETE error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
