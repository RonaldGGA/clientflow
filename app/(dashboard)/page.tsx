import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DollarSign, Users, CalendarCheck, Scissors } from "lucide-react";
import { auth } from "@/lib/auth";
import { MetricCard } from "@/components/dashboard/metric-card";
import { VisitsChart } from "@/components/dashboard/visits-chart";
import { RecentVisits } from "@/components/dashboard/recent-visits";

interface DashboardData {
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

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const headersList = await headers();
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: Object.fromEntries(headersList.entries()),
    });
    if (!res.ok) {
      console.error(
        "[dashboard page] fetch failed:",
        res.status,
        await res.text(),
      );
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.error("[dashboard page] fetch threw:", err);
    return null;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Metric cards with their stagger delays.
// Each card enters 75ms after the previous one —
// like dominoes falling in slow motion.
const CARD_DELAYS = ["0ms", "75ms", "150ms", "225ms"] as const;

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const t = await getTranslations("dashboard");
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center cf-fade-up">
        <p className="text-sm text-zinc-500">{t("error")}</p>
      </div>
    );
  }

  const metrics = [
    {
      label: t("metrics.weeklyRevenue"),
      value: formatCurrency(data.weeklyRevenue),
      icon: DollarSign,
      description: t("metrics.weeklyRevenueDesc"),
      accent: true,
    },
    {
      label: t("metrics.activeClients"),
      value: data.activeClients,
      icon: Users,
      description: t("metrics.activeClientsDesc"),
    },
    {
      label: t("metrics.weeklyVisits"),
      value: data.weeklyVisits,
      icon: CalendarCheck,
      description: t("metrics.weeklyVisitsDesc"),
    },
    {
      label: t("metrics.topService"),
      value: data.topService ?? "—",
      icon: Scissors,
      description: t("metrics.topServiceDesc"),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="cf-fade-up" style={{ animationDelay: "0ms" }}>
        <h1 className="text-xl font-semibold text-white">{t("title")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className="cf-fade-up"
            style={{ animationDelay: CARD_DELAYS[i] }}
          >
            <MetricCard
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              description={metric.description}
              accent={metric.accent}
            />
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 cf-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <VisitsChart data={data.visitsPerDay} />
        <RecentVisits visits={data.recentVisits} />
      </div>
    </div>
  );
}
