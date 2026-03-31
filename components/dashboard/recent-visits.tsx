"use client";

import { useTranslations, useLocale } from "next-intl";

interface RecentVisit {
  id: string;
  clientName: string;
  serviceName: string;
  actualPrice: number;
  createdAt: string;
}

interface RecentVisitsProps {
  visits: RecentVisit[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function RecentVisits({ visits }: RecentVisitsProps) {
  const t = useTranslations("dashboard.recentVisits");
  const tTable = useTranslations("visits.table");
  const locale = useLocale();

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(
      locale === "es" ? "es-CU" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all duration-200 hover:border-zinc-700">
      <h2 className="mb-4 text-sm font-medium text-zinc-400">{t("title")}</h2>

      {visits.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="pb-3 text-left font-medium text-zinc-500">
                  {tTable("client")}
                </th>
                {/* Service column hidden on mobile — too cramped with 4 cols */}
                <th className="pb-3 text-left font-medium text-zinc-500 hidden sm:table-cell">
                  {tTable("service")}
                </th>
                <th className="pb-3 text-right font-medium text-zinc-500">
                  {tTable("price")}
                </th>
                {/* Date column hidden on mobile */}
                <th className="pb-3 text-right font-medium text-zinc-500 hidden sm:table-cell">
                  {tTable("date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {visits.map((visit) => (
                <tr
                  key={visit.id}
                  className="group transition-colors hover:bg-zinc-800/40"
                >
                  <td className="py-3 font-medium text-white">
                    {visit.clientName}
                    {/* On mobile show service below the name in muted text */}
                    <span className="block text-xs text-zinc-500 font-normal sm:hidden mt-0.5">
                      {visit.serviceName}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 hidden sm:table-cell">
                    {visit.serviceName}
                  </td>
                  <td className="py-3 text-right font-medium text-emerald-400">
                    {formatPrice(visit.actualPrice)}
                  </td>
                  <td className="py-3 text-right text-zinc-500 hidden sm:table-cell">
                    {formatDate(visit.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
