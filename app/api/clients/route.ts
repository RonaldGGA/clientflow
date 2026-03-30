import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const PHONE_REGEX = /^[+\d\s\-()\[\]]+$/;

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      businessId: membership.businessId,
      deletedAt: null,
      ...(query.length > 0
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          phone: true,
          notes: true,
          createdAt: true,
        },
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({
      data: {
        clients,
        pagination: {
          total,
          page,
          pageSize: PAGE_SIZE,
          totalPages: Math.ceil(total / PAGE_SIZE),
        },
      },
      error: null,
    });
  } catch (err) {
    console.error("[clients] GET error:", err);
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

    const membership = await getMembership(session.user.id);
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0].message },
        { status: 422 },
      );
    }

    const { name, phone, notes } = parsed.data;

    // Duplicate check: same name + same phone within this business
    const duplicate = await prisma.client.findFirst({
      where: {
        businessId: membership.businessId,
        name,
        phone: phone ?? null,
        deletedAt: null,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { data: null, error: "DUPLICATE_CLIENT" },
        { status: 422 },
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone: phone ?? null,
        notes: notes ?? null,
        businessId: membership.businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        notes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: client, error: null }, { status: 201 });
  } catch (err) {
    console.error("[clients] POST error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
