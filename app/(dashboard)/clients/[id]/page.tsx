// app/(dashboard)/clients/[id]/page.tsx
// Server Component — queries DB directly, no fetch().
// Passes data to ClientProfileAI (Client Component) for interactivity.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ClientProfileAI } from "@/components/clients/client-profile-ai";
import {
  ArrowLeft,
  Phone,
  StickyNote,
  CalendarDays,
  DollarSign,
  Scissors,
  Hash,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) redirect("/login");

  const { id } = await params;
  const isAdmin = membership.role === "admin";

  const client = await prisma.client.findFirst({
    where: { id, businessId: membership.businessId, deletedAt: null },
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

  if (!client) notFound();

  const totalVisits = client.visits.length;
  const totalSpend = client.visits.reduce(
    (sum, v) => sum + Number(v.actualPrice),
    0,
  );
  const lastVisit = client.visits[0]?.createdAt ?? null;

  const serviceCounts: Record<string, number> = {};
  for (const v of client.visits) {
    const name = v.service.name;
    serviceCounts[name] = (serviceCounts[name] ?? 0) + 1;
  }
  const favoriteService =
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const stats = [
    {
      label: "Total visits",
      value: totalVisits,
      icon: Hash,
    },
    {
      label: "Total spend",
      value: formatCurrency(totalSpend),
      icon: DollarSign,
      accent: true,
    },
    {
      label: "Last visit",
      value: lastVisit ? formatDate(lastVisit.toISOString()) : "—",
      icon: CalendarDays,
    },
    {
      label: "Favorite service",
      value: favoriteService ?? "—",
      icon: Scissors,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6 cf-fade-up">
      <Link
        href="/clients"
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {client.name}
        </h1>
        <p className="text-sm text-zinc-500">
          Client since {formatDate(client.createdAt.toISOString())}
        </p>
      </div>

      {(client.phone || client.notes) && (
        <div className="flex flex-col gap-2">
          {client.phone && (
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <Phone className="h-4 w-4 text-zinc-600" />
              {client.phone}
            </span>
          )}
          {client.notes && (
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <StickyNote className="h-4 w-4 text-zinc-600" />
              {client.notes}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-1.5">
              <stat.icon
                className={`h-3.5 w-3.5 ${stat.accent ? "text-emerald-400" : "text-zinc-500"}`}
              />
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
            <span
              className={`text-lg font-semibold tracking-tight ${stat.accent ? "text-emerald-400" : "text-white"}`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <ClientProfileAI
        clientId={client.id}
        initialSummary={client.aiSummary ?? null}
        initialSummaryAt={client.aiSummaryAt?.toISOString() ?? null}
        isAdmin={isAdmin}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Visit history</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {totalVisits} visit{totalVisits !== 1 ? "s" : ""} on record
          </p>
        </div>

        {client.visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm text-zinc-600">No visits recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hidden sm:table-cell">
                    Staff
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Price
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 hidden sm:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {client.visits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-white font-medium">
                      {visit.service.name}
                      {visit.notes && (
                        <span className="block text-xs text-zinc-500 font-normal mt-0.5">
                          {visit.notes}
                        </span>
                      )}
                      <span className="block text-xs text-zinc-600 font-normal sm:hidden mt-0.5">
                        {visit.staff.name ?? "—"} ·{" "}
                        {formatDateTime(visit.createdAt.toISOString())}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 hidden sm:table-cell">
                      {visit.staff.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-emerald-400">
                      {formatCurrency(Number(visit.actualPrice))}
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500 hidden sm:table-cell">
                      {formatDateTime(visit.createdAt.toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
