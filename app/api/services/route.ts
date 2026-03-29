import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  basePrice: z
    .number({ error: "Price must be a number" })
    .positive("Price must be greater than 0")
    .multipleOf(0.01, "Price can have at most 2 decimal places"),
});

async function getAdminMembership(userId: string) {
  const membership = await prisma.businessMember.findFirst({
    where: { userId },
  });
  if (!membership || membership.role !== "admin") return null;
  return membership;
}

export async function GET() {
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

    const services = await prisma.service.findMany({
      where: { businessId: membership.businessId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        basePrice: true,
        createdAt: true,
      },
    });

    // Decimal → number for JSON serialization
    const serialized = services.map((s) => ({
      ...s,
      basePrice: Number(s.basePrice),
    }));

    return NextResponse.json({ data: { services: serialized }, error: null });
  } catch (err) {
    console.error("[services] GET error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body: unknown = await request.json();
    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0].message },
        { status: 422 },
      );
    }

    // Check for duplicate name within the same business
    const existing = await prisma.service.findFirst({
      where: {
        businessId: membership.businessId,
        name: { equals: parsed.data.name, mode: "insensitive" },
        deletedAt: null,
      },
    });
    if (existing) {
      return NextResponse.json(
        { data: null, error: "A service with this name already exists." },
        { status: 409 },
      );
    }

    const service = await prisma.service.create({
      data: {
        name: parsed.data.name,
        basePrice: parsed.data.basePrice,
        businessId: membership.businessId,
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        data: { ...service, basePrice: Number(service.basePrice) },
        error: null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[services] POST error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
