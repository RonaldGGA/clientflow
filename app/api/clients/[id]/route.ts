import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PHONE_REGEX = /^[+\d\s\-()\[\]]+$/;

const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phone: z
    .union([
      z.string().min(1).max(30).regex(PHONE_REGEX, "Invalid phone format"),
      z.null(),
    ])
    .optional(),
  notes: z.string().max(500).optional().nullable(),
});

async function getMembership(userId: string) {
  return prisma.businessMember.findFirst({ where: { userId } });
}

async function findClientForBusiness(id: string, businessId: string) {
  return prisma.client.findFirst({
    where: { id, businessId, deletedAt: null },
  });
}

export async function GET(
  _req: Request,
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

    const membership = await prisma.businessMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "No business membership" },
        { status: 403 },
      );
    }

    const { id } = await params;

    const client = await prisma.client.findFirst({
      where: {
        id,
        businessId: membership.businessId,
        deletedAt: null,
      },
      include: {
        visits: {
          include: {
            service: { select: { name: true } },
            staff: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { data: null, error: "Client not found" },
        { status: 404 },
      );
    }

    const totalVisits = client.visits.length;
    const totalSpend = client.visits.reduce(
      (sum, v) => sum + Number(v.actualPrice),
      0,
    );
    const lastVisit =
      client.visits.length > 0 ? client.visits[0].createdAt : null;

    const serviceCounts: Record<string, number> = {};
    for (const v of client.visits) {
      const name = v.service.name;
      serviceCounts[name] = (serviceCounts[name] ?? 0) + 1;
    }
    const favoriteService =
      Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return NextResponse.json({
      data: {
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          notes: client.notes,
          createdAt: client.createdAt.toISOString(),
          aiSummary: client.aiSummary ?? null,
          aiSummaryAt: client.aiSummaryAt?.toISOString() ?? null,
        },
        stats: {
          totalVisits,
          totalSpend,
          lastVisit: lastVisit?.toISOString() ?? null,
          favoriteService,
        },
        visits: client.visits.map((v) => ({
          id: v.id,
          serviceName: v.service.name,
          staffName: v.staff.name ?? "Unknown",
          actualPrice: Number(v.actualPrice),
          notes: v.notes,
          createdAt: v.createdAt.toISOString(),
        })),
      },
      error: null,
    });
  } catch (err) {
    console.error("[clients/[id]] GET error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
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

    // Resolve the final name and phone after this update
    const resolvedName = parsed.data.name ?? existing.name;
    const resolvedPhone =
      parsed.data.phone !== undefined
        ? (parsed.data.phone ?? null)
        : existing.phone;

    // Duplicate check — exclude the client being edited
    const duplicate = await prisma.client.findFirst({
      where: {
        businessId: membership.businessId,
        name: resolvedName,
        phone: resolvedPhone,
        deletedAt: null,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { data: null, error: "DUPLICATE_CLIENT" },
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
