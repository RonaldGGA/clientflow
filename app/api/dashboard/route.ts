import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

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
        { data: null, error: "No business membership found" },
        { status: 403 },
      );
    }

    if (membership.role !== "admin") {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { businessId } = membership;
    const { weekStart, weekEnd } = getWeekRange();

    const weekFilter = {
      businessId,
      createdAt: { gte: weekStart, lte: weekEnd },
    };

    // Run all independent queries in parallel
    const [
      weeklyRevenueResult,
      activeClientsCount,
      weeklyVisitsCount,
      visitsThisWeek,
      recentVisitsRaw,
    ] = await Promise.all([
      // Sum of actualPrice for visits this week
      prisma.visit.aggregate({
        where: weekFilter,
        _sum: { actualPrice: true },
      }),

      // Active clients (not soft-deleted)
      prisma.client.count({
        where: { businessId, deletedAt: null },
      }),

      // Visit count this week
      prisma.visit.count({
        where: weekFilter,
      }),

      // All visits this week with service name — for topService + visitsPerDay
      prisma.visit.findMany({
        where: weekFilter,
        select: {
          createdAt: true,
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),

      // Last 5 visits with client and service info
      prisma.visit.findMany({
        where: { businessId },
        select: {
          id: true,
          actualPrice: true,
          createdAt: true,
          client: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Compute topService from visits this week
    const serviceCount: Record<string, number> = {};
    for (const visit of visitsThisWeek) {
      const name = visit.service.name;
      serviceCount[name] = (serviceCount[name] ?? 0) + 1;
    }
    const topService =
      Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Compute visitsPerDay — count visits per weekday (Mon=0 … Sun=6)
    const countPerDay: number[] = Array(7).fill(0);
    for (const visit of visitsThisWeek) {
      const day = visit.createdAt.getDay();
      const index = day === 0 ? 6 : day - 1;
      countPerDay[index]++;
    }
    const visitsPerDay = DAY_LABELS.map((day, i) => ({
      day,
      count: countPerDay[i],
    }));

    // Shape recentVisits
    const recentVisits = recentVisitsRaw.map((v) => ({
      id: v.id,
      clientName: v.client.name,
      serviceName: v.service.name,
      actualPrice: Number(v.actualPrice),
      createdAt: v.createdAt.toISOString(),
    }));

    console.log("[dashboard] GET data:", {
      weeklyRevenue: weeklyRevenueResult._sum.actualPrice,
      activeClientsCount,
      weeklyVisitsCount,
      topService,
      visitsPerDay,
      recentVisits,
    });

    return NextResponse.json({
      data: {
        weeklyRevenue: Number(weeklyRevenueResult._sum.actualPrice ?? 0),
        activeClients: activeClientsCount,
        weeklyVisits: weeklyVisitsCount,
        topService,
        visitsPerDay,
        recentVisits,
      },
      error: null,
    });
  } catch (err) {
    console.error("[dashboard] GET error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
