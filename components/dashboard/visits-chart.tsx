"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DAYS = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
};

interface VisitsPerDay {
  day: string;
  count: number;
}

interface VisitsChartProps {
  data: VisitsPerDay[];
}

interface TooltipPayload {
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  const t = useTranslations("dashboard.visitsChart");
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-white">
        {payload[0].value}{" "}
        <span className="font-normal text-zinc-400">{t("label")}</span>
      </p>
    </div>
  );
}

export function VisitsChart({ data }: VisitsChartProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const translatedData = data.map((item, index) => ({
    ...item,
    day: DAYS[locale as keyof typeof DAYS]?.[index] ?? item.day,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-all duration-200 hover:border-zinc-700">
      <h2 className="mb-4 text-sm font-medium text-zinc-400">
        {t("visitsChart.title")}
      </h2>

      {/* Scroll wrapper: on mobile the chart gets a min-width so bars
          never crush together. The user swipes to see all days.
          On md+ screens ResponsiveContainer fills the full width naturally. */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={translatedData}
              barSize={28}
              margin={{ left: -8, right: 8 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#27272a"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 12 }}
                width={24}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
