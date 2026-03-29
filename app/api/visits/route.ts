import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMembership(userId: string) {
  return prisma.businessMember.findFirst({
    where: { userId },
  });
}

// ---------------------------------------------------------------------------
// GET /api/visits
// Query params: page, staffId (admin only), from, to
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const membership = await getMembership(session.user.id);

  if (!membership) {
    return NextResponse.json(
      { data: null, error: "No business membership found" },
      { status: 403 },
    );
  }

  const isAdmin = membership.role === "admin";
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;

  // Staff filter: admin can pass staffId, staff is always locked to self
  const requestedStaffId = searchParams.get("staffId");
  const staffId = isAdmin ? (requestedStaffId ?? undefined) : session.user.id;

  // Date filters
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter =
    from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const where = {
    businessId: membership.businessId,
    ...(staffId ? { staffId } : {}),
    ...dateFilter,
  };

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    }),
    prisma.visit.count({ where }),
  ]);

  const serialized = visits.map((v) => ({
    ...v,
    actualPrice: Number(v.actualPrice),
  }));

  return NextResponse.json({
    data: {
      visits: serialized,
      total,
      page,
      pageSize: PAGE_SIZE,
      pageCount: Math.ceil(total / PAGE_SIZE),
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/visits
// staffId always from session — never from body
// actualPrice defaults to service.basePrice if not provided
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const membership = await getMembership(session.user.id);

  if (!membership) {
    return NextResponse.json(
      { data: null, error: "No business membership found" },
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

  const { clientId, serviceId, actualPrice, notes } = body as {
    clientId?: unknown;
    serviceId?: unknown;
    actualPrice?: unknown;
    notes?: unknown;
  };

  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json(
      { data: null, error: "clientId is required" },
      { status: 400 },
    );
  }

  if (!serviceId || typeof serviceId !== "string") {
    return NextResponse.json(
      { data: null, error: "serviceId is required" },
      { status: 400 },
    );
  }

  if (notes !== undefined && typeof notes !== "string") {
    return NextResponse.json(
      { data: null, error: "notes must be a string" },
      { status: 400 },
    );
  }

  // Validate client belongs to this business and is not deleted
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      businessId: membership.businessId,
      deletedAt: null,
    },
  });

  if (!client) {
    return NextResponse.json(
      { data: null, error: "Client not found" },
      { status: 404 },
    );
  }

  // Validate service belongs to this business and is not deleted
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      businessId: membership.businessId,
      deletedAt: null,
    },
  });

  if (!service) {
    return NextResponse.json(
      { data: null, error: "Service not found" },
      { status: 404 },
    );
  }

  // Resolve price: use provided value if valid, else fall back to basePrice
  let resolvedPrice: number;

  if (actualPrice !== undefined && actualPrice !== null && actualPrice !== "") {
    const parsed = parseFloat(String(actualPrice));
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json(
        { data: null, error: "actualPrice must be a non-negative number" },
        { status: 400 },
      );
    }
    resolvedPrice = parsed;
  } else {
    resolvedPrice = Number(service.basePrice);
  }

  const visit = await prisma.visit.create({
    data: {
      clientId,
      serviceId,
      staffId: session.user.id, // always from session
      businessId: membership.businessId,
      actualPrice: resolvedPrice,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
    include: {
      client: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    {
      data: { ...visit, actualPrice: Number(visit.actualPrice) },
      error: null,
    },
    { status: 201 },
  );
}
