// app/api/clients/[id]/summary/route.ts
// Generates an AI summary for a client and saves it to the DB.
// Admin only. Staff can read the summary but cannot generate it.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  buildClientSummaryPrompt,
  type ClientSummaryStats,
} from "@/lib/prompts/client-summary";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
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
      include: { business: true },
    });
    if (!membership) {
      return NextResponse.json(
        { data: null, error: "No business membership" },
        { status: 403 },
      );
    }

    if (membership.role !== "admin") {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const locale: string = body.locale ?? "en";

    const client = await prisma.client.findFirst({
      where: { id, businessId: membership.businessId, deletedAt: null },
      include: {
        visits: {
          include: {
            service: { select: { name: true } },
            staff: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { data: null, error: "Client not found" },
        { status: 404 },
      );
    }

    if (client.visits.length === 0) {
      return NextResponse.json(
        { data: null, error: "Cannot generate summary — client has no visits" },
        { status: 422 },
      );
    }

    const totalSpend = client.visits.reduce(
      (sum, v) => sum + Number(v.actualPrice),
      0,
    );

    const stats: ClientSummaryStats = {
      clientName: client.name,
      businessName: membership.business.name,
      phone: client.phone,
      notes: client.notes,
      totalVisits: client.visits.length,
      totalSpend,
      firstVisit: client.visits[0].createdAt.toISOString(),
      lastVisit:
        client.visits[client.visits.length - 1].createdAt.toISOString(),
      visits: client.visits.map((v) => ({
        serviceName: v.service.name,
        actualPrice: Number(v.actualPrice),
        staffName: v.staff.name ?? "Unknown",
        date: v.createdAt.toISOString(),
        notes: v.notes,
      })),
    };

    const prompt = buildClientSummaryPrompt(stats, locale);

    let summaryText: string | null = null;

    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 30000);

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: geminiController.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        summaryText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      }
    } catch {
    } finally {
      clearTimeout(geminiTimeout);
    }

    // ── OpenRouter fallback ──────────────────────────────────────────────────
    if (!summaryText) {
      const orController = new AbortController();
      const orTimeout = setTimeout(() => orController.abort(), 30000);

      try {
        const orRes = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            signal: orController.signal,
            body: JSON.stringify({
              model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
              messages: [{ role: "user", content: prompt }],
            }),
          },
        );

        if (orRes.ok) {
          const orData = await orRes.json();
          summaryText = orData?.choices?.[0]?.message?.content ?? null;
        }
      } catch {
        // Both providers failed
      } finally {
        clearTimeout(orTimeout);
      }
    }

    if (!summaryText) {
      return NextResponse.json(
        { data: null, error: "AI generation failed. Try again in a moment." },
        { status: 502 },
      );
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    const updated = await prisma.client.update({
      where: { id },
      data: {
        aiSummary: summaryText,
        aiSummaryAt: new Date(),
      },
    });

    return NextResponse.json({
      data: {
        aiSummary: updated.aiSummary,
        aiSummaryAt: updated.aiSummaryAt?.toISOString() ?? null,
      },
      error: null,
    });
  } catch (err) {
    console.error("[clients/[id]/summary] POST error:", err);
    return NextResponse.json(
      { data: null, error: "Internal server error" },
      { status: 500 },
    );
  }
}
