// lib/data/dashboard.ts
// Lógica de datos del dashboard extraída como función pura.
// Llamada directamente por el Server Component — sin HTTP fetch.
// El API route /api/dashboard también la puede usar si algún día
// un Client Component necesita refrescar los datos sin recargar la página.

import prisma from "@/lib/prisma";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export interface DashboardData {
  weeklyRevenue: number;
  activeClients: number;
  weeklyVisits: number;
  topService: string | null;
  visitsPerDay: { day: string; count: number }[];
  recentVisits: {
    id: string;
    clientName: string;
    serviceName: string;
    actualPrice: number;
    createdAt: string;
  }[];
}

export async function getDashboardData(
  businessId: string,
): Promise<DashboardData> {
  const { weekStart, weekEnd } = getWeekRange();

  const weekFilter = {
    businessId,
    createdAt: { gte: weekStart, lte: weekEnd },
  };

  const [
    weeklyRevenueResult,
    activeClientsCount,
    weeklyVisitsCount,
    visitsThisWeek,
    recentVisitsRaw,
  ] = await Promise.all([
    prisma.visit.aggregate({
      where: weekFilter,
      _sum: { actualPrice: true },
    }),
    prisma.client.count({
      where: { businessId, deletedAt: null },
    }),
    prisma.visit.count({
      where: weekFilter,
    }),
    prisma.visit.findMany({
      where: weekFilter,
      select: {
        createdAt: true,
        service: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
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

  // Top service
  const serviceCount: Record<string, number> = {};
  for (const visit of visitsThisWeek) {
    const name = visit.service.name;
    serviceCount[name] = (serviceCount[name] ?? 0) + 1;
  }
  const topService =
    Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Visits per day
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

  const recentVisits = recentVisitsRaw.map((v) => ({
    id: v.id,
    clientName: v.client.name,
    serviceName: v.service.name,
    actualPrice: Number(v.actualPrice),
    createdAt: v.createdAt.toISOString(),
  }));

  return {
    weeklyRevenue: Number(weeklyRevenueResult._sum.actualPrice ?? 0),
    activeClients: activeClientsCount,
    weeklyVisits: weeklyVisitsCount,
    topService,
    visitsPerDay,
    recentVisits,
  };
}
