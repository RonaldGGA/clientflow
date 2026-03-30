import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildReportPrompt, WeeklyStats } from "@/lib/prompts/report";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LLM_TIMEOUT_MS = 30_000;

async function getAdminMembership(userId: string) {
  return prisma.businessMember.findFirst({
    where: { userId, role: "admin" },
    include: { business: { select: { id: true, name: true } } },
  });
}

function getWeekRange(weekStart: Date): { start: Date; end: Date } {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getPreviousWeekRange(weekStart: Date): { start: Date; end: Date } {
  const prevStart = new Date(weekStart);
  prevStart.setDate(prevStart.getDate() - 7);
  return getWeekRange(prevStart);
}

async function computeWeeklyStats(
  businessId: string,
  businessName: string,
  weekStart: Date,
): Promise<WeeklyStats> {
  const { start, end } = getWeekRange(weekStart);
  const prev = getPreviousWeekRange(weekStart);

  const [currentVisits, previousVisits] = await Promise.all([
    prisma.visit.findMany({
      where: { businessId, createdAt: { gte: start, lte: end } },
      include: {
        client: { select: { name: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.visit.findMany({
      where: { businessId, createdAt: { gte: prev.start, lte: prev.end } },
      select: { actualPrice: true },
    }),
  ]);

  const totalVisits = currentVisits.length;
  const totalRevenue = currentVisits.reduce(
    (sum, v) => sum + Number(v.actualPrice),
    0,
  );
  const previousWeekVisits = previousVisits.length;
  const previousWeekRevenue = previousVisits.reduce(
    (sum, v) => sum + Number(v.actualPrice),
    0,
  );

  const serviceMap = new Map<string, { count: number; revenue: number }>();
  for (const v of currentVisits) {
    const key = v.service.name;
    const existing = serviceMap.get(key) ?? { count: 0, revenue: 0 };
    serviceMap.set(key, {
      count: existing.count + 1,
      revenue: existing.revenue + Number(v.actualPrice),
    });
  }
  const topServices = Array.from(serviceMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const clientMap = new Map<string, number>();
  for (const v of currentVisits) {
    clientMap.set(v.client.name, (clientMap.get(v.client.name) ?? 0) + 1);
  }
  const topClients = Array.from(clientMap.entries())
    .map(([name, visits]) => ({ name, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  const staffMap = new Map<string, { visits: number; revenue: number }>();
  for (const v of currentVisits) {
    const key = v.staff.name ?? "Unknown";
    const existing = staffMap.get(key) ?? { visits: 0, revenue: 0 };
    staffMap.set(key, {
      visits: existing.visits + 1,
      revenue: existing.revenue + Number(v.actualPrice),
    });
  }
  const staffActivity = Array.from(staffMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.visits - a.visits);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return {
    businessName,
    weekStart: fmt(start),
    weekEnd: fmt(end),
    totalVisits,
    totalRevenue,
    previousWeekVisits,
    previousWeekRevenue,
    topServices,
    topClients,
    staffActivity,
  };
}

async function callGemini(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenRouter returned empty response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateReport(prompt: string): Promise<string> {
  try {
    return await callGemini(prompt);
  } catch (geminiError) {
    console.error("[reports] Gemini failed, trying OpenRouter:", geminiError);
    try {
      return await callOpenRouter(prompt);
    } catch (openRouterError) {
      console.error("[reports] OpenRouter also failed:", openRouterError);
      throw new Error("All LLM providers failed");
    }
  }
}

// ---------------------------------------------------------------------------
// GET /api/reports?weekStart=YYYY-MM-DD
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
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

  const weekStartParam = request.nextUrl.searchParams.get("weekStart");
  if (!weekStartParam) {
    return NextResponse.json(
      { data: null, error: "weekStart is required" },
      { status: 400 },
    );
  }

  const weekStart = new Date(weekStartParam);
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json(
      { data: null, error: "Invalid weekStart date" },
      { status: 400 },
    );
  }

  const { start } = getWeekRange(weekStart);
  const report = await prisma.report.findFirst({
    where: { businessId: adminMembership.businessId, weekStart: start },
  });

  return NextResponse.json({ data: { report }, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/reports
// Body: { weekStart: string, force?: boolean, locale?: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    weekStart: weekStartRaw,
    force = false,
    locale = "en",
  } = body as {
    weekStart?: unknown;
    force?: unknown;
    locale?: string;
  };

  if (!weekStartRaw || typeof weekStartRaw !== "string") {
    return NextResponse.json(
      { data: null, error: "weekStart is required" },
      { status: 400 },
    );
  }

  const weekStart = new Date(weekStartRaw);
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json(
      { data: null, error: "Invalid weekStart date" },
      { status: 400 },
    );
  }

  const { start, end } = getWeekRange(weekStart);
  const businessId = adminMembership.businessId;
  const businessName = adminMembership.business.name;

  const existing = await prisma.report.findFirst({
    where: { businessId, weekStart: start },
  });

  if (existing && !force) {
    return NextResponse.json({ data: { report: existing }, error: null });
  }

  const stats = await computeWeeklyStats(businessId, businessName, weekStart);
  const prompt = buildReportPrompt(stats, locale);

  let content: string;
  try {
    content = await generateReport(prompt);
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: "Report generation failed. Please try again later.",
      },
      { status: 503 },
    );
  }

  if (existing) {
    await prisma.report.delete({ where: { id: existing.id } });
  }

  const report = await prisma.report.create({
    data: { businessId, weekStart: start, weekEnd: end, content },
  });

  return NextResponse.json({ data: { report }, error: null }, { status: 201 });
}
