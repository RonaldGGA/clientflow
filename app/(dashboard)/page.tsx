import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
    // Use absolute URL for server-side fetch in Next.js
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: await headers(),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.data ?? null;
  } catch {
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

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-500">
          Failed to load dashboard data. Try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview for the current week
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Weekly Revenue"
          value={formatCurrency(data.weeklyRevenue)}
          icon={DollarSign}
          description="This week's total"
          accent
        />
        <MetricCard
          label="Active Clients"
          value={data.activeClients}
          icon={Users}
          description="Total registered"
        />
        <MetricCard
          label="Visits This Week"
          value={data.weeklyVisits}
          icon={CalendarCheck}
          description="Mon – Sun"
        />
        <MetricCard
          label="Top Service"
          value={data.topService ?? "—"}
          icon={Scissors}
          description="Most booked this week"
        />
      </div>

      {/* Chart + Recent visits */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VisitsChart data={data.visitsPerDay} />
        <RecentVisits visits={data.recentVisits} />
      </div>
    </div>
  );
}
